# ============================================================
#  app.py — FINAL
#  - Multiple Haar cascades + relaxed params
#  - CLAHE contrast boost before detection
#  - Full image fallback if cascade fails
#  - Cosine + L2 hybrid recognition with voting
# ============================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2, os, numpy as np
from pathlib import Path
from collections import Counter
import os
import tempfile

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("DeepFace loaded")
except Exception as e:
    DEEPFACE_AVAILABLE = False
    print(" DeepFace not available:", e)

app = Flask(__name__)
CORS(app)

BASE_DIR  = Path(__file__).parent
DB_PATH   = BASE_DIR / "database"
TEMP_PATH = BASE_DIR / "temp.jpg"
FACE_PATH = BASE_DIR / "temp_face.jpg"
DB_PATH.mkdir(exist_ok=True)

# ── Load cascades ──
cascade_files = [
    "haarcascade_frontalface_default.xml",
    "haarcascade_frontalface_alt.xml",
    "haarcascade_frontalface_alt2.xml",
]
cascades = []
for cf in cascade_files:
    path = cv2.data.haarcascades + cf
    if os.path.exists(path):
        cascades.append(cv2.CascadeClassifier(path))
print(f" {len(cascades)} cascade detectors loaded")

# ============================================================
#  DATABASE
# ============================================================
known_embeddings = []
known_names      = []

def load_database():
    global known_embeddings, known_names
    known_embeddings, known_names = [], []
    if not DEEPFACE_AVAILABLE:
        return
    print(" Loading face DB...")
    for person in sorted(os.listdir(DB_PATH)):
        ppath = os.path.join(DB_PATH, person)
        if not os.path.isdir(ppath):
            continue
        loaded = 0
        for img_name in os.listdir(ppath):
            if not img_name.lower().endswith(('.jpg','.jpeg','.png')):
                continue
            try:
                result = DeepFace.represent(
                    img_path=os.path.join(ppath, img_name),
                    model_name="SFace",
                    detector_backend="opencv",
                    enforce_detection=False
                )
                if result:
                    known_embeddings.append(result[0]["embedding"])
                    known_names.append(person)
                    loaded += 1
            except Exception as e:
                print(f"   {img_name}: {e}")
        if loaded:
            print(f"   {person}: {loaded} images")
    print(f" DB: {len(known_embeddings)} embeddings, {len(set(known_names))} people")

load_database()

# ============================================================
#  FACE DETECTION
# ============================================================
def enhance(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(l)
    return cv2.cvtColor(cv2.merge((l,a,b)), cv2.COLOR_LAB2BGR)

def detect_face(img):
    proc = enhance(img)
    gray = cv2.cvtColor(proc, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    # Try each cascade with relaxed params first
    for cascade in cascades:
        for sf, mn, ms in [(1.05,3,(30,30)), (1.1,4,(40,40)), (1.15,3,(25,25))]:
            faces = cascade.detectMultiScale(gray, scaleFactor=sf, minNeighbors=mn, minSize=ms)
            if len(faces) > 0:
                faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)
                x,y,w,h = faces[0]
                pad = int(0.15 * min(w,h))
                x1 = max(0, x-pad); y1 = max(0, y-pad)
                x2 = min(img.shape[1], x+w+pad); y2 = min(img.shape[0], y+h+pad)
                crop = img[y1:y2, x1:x2]
                if crop.size > 0:
                    cv2.imwrite(str(FACE_PATH), crop)
                    print(f" Face: {x2-x1}x{y2-y1} (sf={sf})")
                    return str(FACE_PATH)

    # Fallback: full image to DeepFace
    print(" Cascade failed — using full image")
    cv2.imwrite(str(FACE_PATH), img)
    return str(FACE_PATH)

# ============================================================
#  RECOGNITION
# ============================================================
def cos_sim(a, b):
    a,b = np.array(a), np.array(b)
    return float(np.dot(a,b) / (np.linalg.norm(a)*np.linalg.norm(b) + 1e-9))

def recognize(img_path):
    if not DEEPFACE_AVAILABLE or not known_embeddings:
        return "unknown", 0

    img = cv2.imread(str(img_path))
    if img is None:
        return "no_face", 0

    face_path = detect_face(img)

    try:
        result = DeepFace.represent(
            img_path=face_path,
            model_name="SFace",
            detector_backend="opencv",
            enforce_detection=False
        )
        if not result:
            return "unknown", 0

        inp = np.array(result[0]["embedding"])
        scores = []
        for i, db_emb in enumerate(known_embeddings):
            db = np.array(db_emb)
            l2  = float(np.linalg.norm(inp - db))
            cos = cos_sim(inp, db)
            scores.append((known_names[i], l2, cos))

        scores.sort(key=lambda x: x[1])
        print("🏆 Top matches:")
        for n,l2,cos in scores[:4]:
            print(f"   {n}: L2={l2:.2f} cos={cos:.4f}")

        # Thresholds
        matched = [(n,l2,cos) for n,l2,cos in scores if l2 < 25.0 and cos > 0.65]
        if not matched:
            print(f" No match. Best: {scores[0][0]} L2={scores[0][1]:.2f}")
            return "unknown", 0

        vote   = Counter(m[0] for m in matched)
        winner = vote.most_common(1)[0][0]
        bcos   = max(cos for n,_,cos in matched if n==winner)
        print(f" MATCH: {winner} (votes={vote[winner]}, cos={bcos:.4f})")
        return winner, round(bcos, 3)

    except Exception as e:
        import traceback; traceback.print_exc()
        return "unknown", 0

# ============================================================
#  ROUTES
# ============================================================
@app.route("/recognize", methods=["POST"])
def recognize_route():
    try:
        if "image" not in request.files:
            return jsonify({"status":"error","error":"No image"}), 400
        request.files["image"].save(str(TEMP_PATH))
        name, conf = recognize(str(TEMP_PATH))
        if name == "no_face":  return jsonify({"status":"no_face"})
        if name != "unknown":  return jsonify({"status":"employee","name":name,"confidence":conf})
        return jsonify({"status":"unknown"})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status":"error","error":str(e)}), 500

@app.route("/reload-db", methods=["POST"])
def reload():
    load_database()
    return jsonify({"success":True,"total":len(known_embeddings),"people":len(set(known_names))})

@app.route("/db-status")
def db_status():
    return jsonify({"embeddings":len(known_embeddings),"people":dict(Counter(known_names)),"deepface":DEEPFACE_AVAILABLE})

@app.route("/health")
def health():
    return jsonify({"status":"ok","deepface":DEEPFACE_AVAILABLE,"db":len(known_embeddings)})

@app.route("/")
def home():
    return " Oxymora Face Recognition Server"

if __name__ == "__main__":
    print(f" Starting on port 5001 | DB: {len(known_embeddings)} faces")
    app.run(host="0.0.0.0", port=5001, debug=False)