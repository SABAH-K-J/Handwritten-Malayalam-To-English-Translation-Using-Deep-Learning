import cv2
import numpy as np
import json

# ==========================================
# 1. GEOMETRY HELPERS (Keep for Frontend Crop)
# ==========================================
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

def manual_crop(image, points_json):
    try:
        pts = np.array(json.loads(points_json), dtype="float32")
        h, w = image.shape[:2]
        if np.max(pts) <= 1.0:
            pts[:, 0] *= w
            pts[:, 1] *= h
        return four_point_transform(image, pts)
    except Exception as e:
        print(f"Manual Crop Failed: {e}")
        return image

def get_document_corners(image):
    ratio = image.shape[0] / 600.0
    small = cv2.resize(image, (int(image.shape[1] / ratio), 600))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 75, 200)
    cnts, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4, 2)
            rect = order_points(pts)
            h, w = small.shape[:2]
            return [[float(p[0]/w), float(p[1]/h)] for p in rect]
    return [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]

# ==========================================
# 2. MATCHED TRAINING PREPROCESSING (The Fix)
# ==========================================
def preprocess_crop_for_ocr(crop_img, target_h=64, target_w=256):
    """
    Proper pipeline for models trained on BINARIZED handwritten images.
    Binarize FIRST at full resolution, then resize.
    """

    # 1. Grayscale
    if len(crop_img.shape) == 3:
        gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = crop_img.copy()

    # 2. Adaptive threshold at ORIGINAL resolution
    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,   # block size
        15    # constant (tuned for pen strokes)
    )

    h, w = binary.shape

    # 3. Only downscale if too tall
    if h > target_h:
        scale = target_h / h
        new_w = int(w * scale)
        resized = cv2.resize(binary, (new_w, target_h), interpolation=cv2.INTER_AREA)
    else:
        resized = binary.copy()
        new_w = w

    # 4. Pad height
    pad_top = (target_h - resized.shape[0]) // 2
    pad_bottom = target_h - resized.shape[0] - pad_top
    resized = cv2.copyMakeBorder(
        resized, pad_top, pad_bottom, 0, 0,
        cv2.BORDER_CONSTANT, value=255
    )

    # 5. If width too big → downscale
    if resized.shape[1] > target_w:
        resized = cv2.resize(resized, (target_w, target_h), interpolation=cv2.INTER_AREA)

    # 6. Pad right
    pad_right = target_w - resized.shape[1]
    final = cv2.copyMakeBorder(
        resized, 0, 0, 0, pad_right,
        cv2.BORDER_CONSTANT, value=255
    )

    # 7. Normalize
    final = final.astype(np.float32) / 255.0

    return final

