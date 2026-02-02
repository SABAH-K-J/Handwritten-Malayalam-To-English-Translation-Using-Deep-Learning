import cv2
import numpy as np
import json

# ==========================================
# 1. GEOMETRY HELPERS
# ==========================================

def order_points(pts):
    """Orders coordinates: [TL, TR, BR, BL]"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)] # TL
    rect[2] = pts[np.argmax(s)] # BR
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)] # TR
    rect[3] = pts[np.argmax(diff)] # BL
    return rect

def four_point_transform(image, pts):
    """Warps the image to get a top-down view."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxWidth, maxHeight))

# ==========================================
# 2. FRONTEND INTEGRATION HELPERS
# ==========================================

def manual_crop(image, points_json):
    """Applies crop from Frontend Crop Editor."""
    try:
        pts = np.array(json.loads(points_json), dtype="float32")
        h, w = image.shape[:2]
        pts[:, 0] *= w
        pts[:, 1] *= h
        return four_point_transform(image, pts)
    except Exception as e:
        print(f"Manual Crop Failed: {e}")
        return image

def get_document_corners(image):
    """Auto-detects document corners for the Frontend."""
    ratio = image.shape[0] / 600.0
    small = cv2.resize(image, (int(image.shape[1] / ratio), 600))
    
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (11, 11), 0) 
    edges = cv2.Canny(blurred, 75, 200)
    
    kernel = np.ones((5, 5), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=2)
    
    cnts, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    
    default_points = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]
    total_area = small.shape[0] * small.shape[1]

    for c in cnts:
        if cv2.contourArea(c) < (total_area * 0.20): continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        
        if len(approx) == 4:
            pts = approx.reshape(4, 2)
            rect = order_points(pts)
            h_small, w_small = small.shape[:2]
            normalized_pts = []
            for pt in rect:
                normalized_pts.append([float(pt[0]/w_small), float(pt[1]/h_small)])
            return normalized_pts
            
    return default_points

# ==========================================
# 3. CROP CLEANUP (ANTI-PIXELATION PIPELINE)
# ==========================================

def preprocess_crop_for_ocr(crop_img):
    """
    Cleans a SINGLE detected text box.
    Uses 'Super-Resolution' (Upscaling) + Adaptive Thresholding to fix pixelation.
    Returns: Black Text on White Background.
    """
    # 1. Grayscale
    if len(crop_img.shape) == 3:
        gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = crop_img

    # 2. UPSCALE (The Anti-Pixelation Fix)
    # We blow the image up to ~96px height. This "invents" pixels between the 
    # jagged edges using cubic interpolation, making the text smooth.
    target_height = 96
    h, w = gray.shape
    scale = target_height / float(h)
    new_w = int(w * scale)
    # INTER_CUBIC is slower but best for smoothing jagged edges
    gray_highres = cv2.resize(gray, (new_w, target_height), interpolation=cv2.INTER_CUBIC)

    # 3. SMOOTHING (Denoise)
    # Bilateral filter removes paper noise but keeps text edges sharp.
    # d=9, sigmaColor=75, sigmaSpace=75 are standard good values.
    smoothed = cv2.bilateralFilter(gray_highres, 9, 75, 75)

    # 4. BINARIZE (Adaptive)
    # Gaussian threshold adapts to lighting (shadows vs bright spots).
    # THRESH_BINARY gives: Pixels > thresh = 255 (White BG), Pixels < thresh = 0 (Black Text).
    # BlockSize=31 (large area context), C=10 (sensitivity).
    binarized = cv2.adaptiveThreshold(
        smoothed, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 
        31, 10
    )

    # 5. REMOVE NOISE (Despeckle)
    # Since text is Black (0) and BG is White (255), we invert to find connected components (White text).
    inverted = cv2.bitwise_not(binarized)
    
    # Analyze blobs
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(inverted, connectivity=8)
    
    # Create a mask of "Valid Text Blobs"
    safe_zone_mask = np.zeros_like(inverted)
    
    # Filter: Keep blobs that are larger than 15 pixels (removes stray dots)
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area > 15: 
            safe_zone_mask[labels == i] = 255
            
    # Apply mask
    cleaned_inverted = cv2.bitwise_and(inverted, inverted, mask=safe_zone_mask)
    
    # Flip back to standard: Black Text on White BG
    final_clean = cv2.bitwise_not(cleaned_inverted)

    # 6. PADDING
    # Add a comfortable white border so text doesn't touch edges
    padding = 10
    final_output = cv2.copyMakeBorder(
        final_clean, 
        padding, padding, padding, padding, 
        cv2.BORDER_CONSTANT, 
        value=[255, 255, 255] # White
    )

    return final_output