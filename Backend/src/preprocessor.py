import cv2
import numpy as np

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
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

def deskew_page_safe(image):
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
        
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 5))
    dilated = cv2.dilate(thresh, kernel, iterations=2)
    
    cnts, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts: return image
    
    main_text_block = max(cnts, key=cv2.contourArea)
    rect = cv2.minAreaRect(main_text_block)
    center, (w, h), angle = rect

    if w < h: angle += 90
    if angle < -45: angle = -(90 + angle)
        
    if abs(angle) < 0.5: return image
    if abs(angle) > 5.0: return image

    (h_img, w_img) = image.shape[:2]
    center_img = (w_img // 2, h_img // 2)
    M = cv2.getRotationMatrix2D(center_img, angle, 1.0)
    
    rotated = cv2.warpAffine(
        image, M, (w_img, h_img), 
        flags=cv2.INTER_CUBIC, 
        borderMode=cv2.BORDER_CONSTANT, 
        borderValue=(255, 255, 255)
    )
    return rotated

def remove_shadows_and_normalize(image):
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    dilated = cv2.dilate(gray, np.ones((7, 7), np.uint8))
    bg = cv2.medianBlur(dilated, 21)
    diff = 255 - cv2.absdiff(gray, bg)
    norm_img = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
    return norm_img

def clean_pepper_noise_zone_based(image, anchor_min_area=30):
    _, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
    inverted = cv2.bitwise_not(binary) 
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(inverted, connectivity=8)
    safe_zone_mask = np.zeros_like(inverted)
    
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if area > anchor_min_area:
            safe_zone_mask[labels == i] = 255
            top_pad = 35   
            side_pad = 8
            bottom_pad = 5
            safe_x = max(0, x - side_pad)
            safe_y = max(0, y - top_pad)
            safe_w = w + (side_pad * 2)
            safe_h = h + top_pad + bottom_pad
            cv2.rectangle(safe_zone_mask, (safe_x, safe_y), (safe_x + safe_w, safe_y + safe_h), 255, -1)
            
    kept_pixels = cv2.bitwise_and(inverted, inverted, mask=safe_zone_mask)
    final_image = cv2.bitwise_not(kept_pixels)
    return final_image

def run_preprocessing_pipeline(image):
    """Runs the full cleanup chain."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_finder = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur_finder, 75, 200)
    cnts, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    
    warped = image
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            warped = four_point_transform(image, approx.reshape(4, 2))
            break
    
    deskewed = deskew_page_safe(warped)
    normalized = remove_shadows_and_normalize(deskewed)
    _, binarized = cv2.threshold(normalized, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    final_clean = clean_pepper_noise_zone_based(binarized, anchor_min_area=30)
    processed_bgr = cv2.cvtColor(final_clean, cv2.COLOR_GRAY2BGR)
    
    return processed_bgr