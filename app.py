from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from bson.errors import InvalidId
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
from functools import wraps
import html

app = Flask(__name__)
CORS(app)

# --- Database & Config ---
MONGO_URI = os.getenv("MONGO_URI")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_EMAIL_PASSWORD = os.getenv("ADMIN_EMAIL_PASSWORD")

# SECURITY: Set an Admin PIN in your Render Environment Variables. Default is 778899.
ADMIN_PIN = os.getenv("ADMIN_PIN", "778899")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is not set.")

client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client['procad_db']

products_collection = db['products']
comments_collection = db['comments']
requests_collection = db['custom_requests']
projects_collection = db['projects']

DEFAULT_ABOUT = {
    "headline": "3D Artist, CAD Designer & Aerospace Engineer",
    "subtitle": "SolidWorks Mechanical Design • Blender 3D Animation • Aerospace & Robotics Systems",
    "bio": [
        "I am a passionate 3D Artist, Designer, and Aerospace Engineering student with a strong interest in 3D modelling, animation, product visualization, and creative design. I specialize in creating detailed 3D models, realistic environments, cinematic renders, and animations using Blender.",
        "Alongside my creative skills, I have experience in CAD modelling and mechanical design using SolidWorks and other design tools. I enjoy transforming ideas and concepts into visually engaging and technically detailed 3D creations.",
        "My work combines creativity, technical knowledge, and attention to detail, with a continuous passion for learning new techniques and exploring innovative design possibilities."
    ],
    "expertise": [
        "3D Modelling",
        "3D Animation",
        "Product Visualization",
        "Environment Design",
        "VFX",
        "CAD Design",
        "Rendering",
        "Motion Graphics"
    ]
}

INITIAL_PROJECTS = [
    {
        "badge": "PROJECT 01 // AEROSPACE PROPULSION",
        "title": "Cable Driven Thrust Vector Control (CDTVC) System",
        "role": "Aerospace Engineering | Mechanical Design | Thrust Vector Control",
        "domain": ["Aerospace Engineering", "Mechanical Design", "Thrust Vector Control"],
        "tools": ["SolidWorks", "Blender"],
        "description": (
            "The Cable Driven Thrust Vector Control (CDTVC) System is an aerospace engineering project "
            "focused on developing an alternative mechanism for controlling rocket thrust direction using "
            "a cable-driven arrangement. The system utilizes high-strength steel cables, precision pulleys, "
            "and electromechanical actuators to achieve controlled movement of the thrust vector. The complete "
            "mechanical assembly was designed and modelled in SolidWorks, with a 3D animation created using "
            "Blender to demonstrate the mechanism and its working principle."
        ),
        "contributions": [
            "Designed and developed the 3D mechanical components and assembly using SolidWorks.",
            "Modelled the cable routing, pulley arrangement, and actuator mounting system.",
            "Created a 3D animated demonstration of the mechanism using Blender.",
            "Contributed to the mechanical design and visualization of the thrust vector control concept."
        ],
        "images": ["cdtvc_1.jpg", "cdtvc_2.jpg", "cdtvc_3.jpg"]
    },
    {
        "badge": "PROJECT 02 // ROBOTICS & ROVER SYSTEMS",
        "title": "Rover Mechanical Design – Team Tarkashya",
        "role": "CAD Head | Mechanical Design — Team Tarkashya",
        "domain": ["Robotics", "Mechanical Design", "Rover Development"],
        "tools": ["SolidWorks", "CAD Modelling", "Mechanical Design", "3D Assembly"],
        "description": (
            "As a member of Team Tarkashya, the college rover development team, I contributed to the mechanical "
            "design and development of a rover designed for challenging terrain and practical robotic applications. "
            "My primary responsibility involved designing and developing the rover chassis and robotic arm, focusing "
            "on structural design, mechanical integration, and functional movement."
        ),
        "contributions": [
            "Designed and modelled the rover chassis, focusing on structural strength and component arrangement.",
            "Developed the robotic arm assembly, including shoulder and elbow mechanisms.",
            "Worked on actuator integration and mechanical movement considerations.",
            "Created and refined 3D CAD models and mechanical assemblies.",
            "Contributed to the overall mechanical design and development of the rover."
        ],
        "images": ["rover_1.jpg", "rover_2.jpg", "rover_3.jpg"]
    }
]


def seed_projects_if_empty():
    if projects_collection.count_documents({}) == 0:
        projects_collection.insert_many(INITIAL_PROJECTS)


# --- SECURITY LOCKDOWN DECORATOR ---
def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)

        if request.headers.get('X-Admin-Key') != ADMIN_PIN:
            print("🚨 BLOCKED HACKING ATTEMPT!")
            return jsonify({"error": "Unauthorized. Access Denied."}), 403

        return f(*args, **kwargs)
    return decorated_function


def format_product(doc):
    prod_id = str(doc["_id"])
    comments_cursor = comments_collection.find({"product_id": prod_id})
    comments = []
    for c in comments_cursor:
        comments.append({
            "id": str(c["_id"]),
            "user_name": html.escape(c.get("user_name", "")),
            "text": html.escape(c.get("text", ""))
        })
    return {
        "id": prod_id,
        "name": html.escape(doc.get("name", "")),
        "description": html.escape(doc.get("description", "")),
        "price": float(doc.get("price", 0.0)),
        "image_url": doc.get("image_url", ""),
        "download_url": doc.get("download_url", ""),
        "model_3d_url": doc.get("model_3d_url", ""),
        "comments": comments
    }


def format_project(doc):
    return {
        "id": str(doc["_id"]),
        "badge": html.escape(doc.get("badge", "")),
        "title": html.escape(doc.get("title", "")),
        "role": html.escape(doc.get("role", "")),
        "domain": [html.escape(d) for d in doc.get("domain", [])],
        "tools": [html.escape(t) for t in doc.get("tools", [])],
        "description": html.escape(doc.get("description", "")),
        "contributions": [html.escape(c) for c in doc.get("contributions", [])],
        "images": doc.get("images", [])
    }


# --- Portfolio & Projects Endpoints ---
@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    try:
        seed_projects_if_empty()
        projects = [format_project(p) for p in projects_collection.find()]
        return jsonify({"about": DEFAULT_ABOUT, "projects": projects}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects', methods=['GET'])
def get_projects():
    try:
        seed_projects_if_empty()
        projects = [format_project(p) for p in projects_collection.find()]
        return jsonify(projects), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects', methods=['POST', 'OPTIONS'])
@require_admin
def add_project():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    if not data.get("title"):
        return jsonify({"error": "Project title is required"}), 400

    new_project = {
        "badge": data.get("badge", "PORTFOLIO PROJECT"),
        "title": data.get("title", "").strip(),
        "role": data.get("role", "").strip(),
        "domain": data.get("domain", []),
        "tools": data.get("tools", []),
        "description": data.get("description", "").strip(),
        "contributions": data.get("contributions", []),
        "images": data.get("images", [])
    }
    res = projects_collection.insert_one(new_project)
    return jsonify({"message": "Project added successfully", "id": str(res.inserted_id)}), 201


@app.route('/api/projects/<project_id>', methods=['PUT', 'OPTIONS'])
@require_admin
def update_project(project_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        oid = ObjectId(project_id)
        data = request.get_json(silent=True) or {}
        update_doc = {
            "badge": data.get("badge", "PORTFOLIO PROJECT"),
            "title": data.get("title", "").strip(),
            "role": data.get("role", "").strip(),
            "domain": data.get("domain", []),
            "tools": data.get("tools", []),
            "description": data.get("description", "").strip(),
            "contributions": data.get("contributions", []),
            "images": data.get("images", [])
        }
        result = projects_collection.update_one({"_id": oid}, {"$set": update_doc})
        if result.matched_count == 0:
            return jsonify({"error": "Project not found"}), 404
        return jsonify({"message": "Project updated successfully"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid project ID"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/projects/<project_id>', methods=['DELETE', 'OPTIONS'])
@require_admin
def delete_project(project_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        oid = ObjectId(project_id)
        result = projects_collection.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return jsonify({"error": "Project not found"}), 404
        return jsonify({"message": "Project deleted successfully"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid project ID"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Product Endpoints ---
@app.route('/api/products', methods=['GET'])
def get_products():
    products = [format_product(doc) for doc in products_collection.find()]
    return jsonify(products), 200


@app.route('/api/products', methods=['POST', 'OPTIONS'])
@require_admin
def add_product():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    new_product = {
        "name": data.get('name', ''),
        "description": data.get('description', ''),
        "price": float(data.get('price', 0)),
        "image_url": data.get('image_url', ''),
        "download_url": data.get('download_url', ''),
        "model_3d_url": data.get('model_3d_url', '')
    }
    products_collection.insert_one(new_product)
    return jsonify({"message": "Product added successfully"}), 201


@app.route('/api/products/<product_id>', methods=['PUT', 'OPTIONS'])
@require_admin
def update_product(product_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        oid = ObjectId(product_id)
        data = request.get_json(silent=True) or {}
        updated_data = {
            "name": data.get('name', ''),
            "description": data.get('description', ''),
            "price": float(data.get('price', 0)),
            "image_url": data.get('image_url', ''),
            "download_url": data.get('download_url', ''),
            "model_3d_url": data.get('model_3d_url', '')
        }
        products_collection.update_one({"_id": oid}, {"$set": updated_data})
        return jsonify({"message": "Product updated successfully"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid product ID"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/products/<product_id>', methods=['DELETE', 'OPTIONS'])
@require_admin
def delete_product(product_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        oid = ObjectId(product_id)
        products_collection.delete_one({"_id": oid})
        comments_collection.delete_many({"product_id": product_id})
        return jsonify({"message": "Product deleted successfully"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid product ID"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Comments Endpoints ---
@app.route('/api/comments', methods=['POST'])
def add_comment():
    data = request.get_json(silent=True) or {}
    if not data.get('product_id') or not data.get('text'):
        return jsonify({"error": "product_id and text are required"}), 400
    new_comment = {
        "product_id": data.get('product_id'),
        "user_name": data.get('user_name', 'Guest'),
        "text": data.get('text')
    }
    comments_collection.insert_one(new_comment)
    return jsonify({"message": "Comment added successfully"}), 201


# --- Custom Requests Endpoints ---
@app.route('/api/requests', methods=['GET'])
def get_requests():
    reqs = []
    for doc in requests_collection.find():
        reqs.append({
            "id": str(doc["_id"]),
            "req_type": html.escape(doc.get("req_type", "Custom Design")),
            "user_email": html.escape(doc.get("user_email", "")),
            "phone": html.escape(doc.get("phone", "N/A")),
            "details": html.escape(doc.get("details", "")),
            "reference_link": doc.get("reference_link", ""),
            "status": doc.get("status", "Pending"),
            "price": float(doc.get("price", 0.0)),
            "payment_status": doc.get("payment_status", "Unpaid"),
            "completed_link": doc.get("completed_link", ""),
            "completed_image": doc.get("completed_image", ""),
            "created_at": doc.get("created_at", "")
        })
    return jsonify(reqs[::-1]), 200


@app.route('/api/requests/<req_id>', methods=['PUT', 'OPTIONS'])
@require_admin
def update_request_status(req_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        oid = ObjectId(req_id)
        data = request.get_json(silent=True) or {}
        update_fields = {}
        if 'status' in data:
            update_fields['status'] = data['status']
        if 'payment_status' in data:
            update_fields['payment_status'] = data['payment_status']
        if 'price' in data:
            update_fields['price'] = float(data['price'])
        if 'completed_link' in data:
            update_fields['completed_link'] = data['completed_link']
        if 'completed_image' in data:
            update_fields['completed_image'] = data['completed_image']

        requests_collection.update_one({"_id": oid}, {"$set": update_fields})
        return jsonify({"message": "Order updated successfully"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid request ID"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/requests', methods=['POST', 'OPTIONS'])
def submit_request():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.get_json(silent=True) or {}
        new_req = {
            "req_type": data.get("req_type", "Custom Design"),
            "details": data.get('details', ''),
            "reference_link": data.get('reference_link', ''),
            "phone": data.get('phone', ''),
            "user_email": data.get('user_email', 'guest@example.com'),
            "status": data.get('status', 'Pending'),
            "price": float(data.get('price', 0.0)),
            "payment_status": data.get('payment_status', 'Unpaid'),
            "completed_link": data.get('completed_link', ''),
            "completed_image": "",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        requests_collection.insert_one(new_req)

        if new_req["req_type"] == "Custom Design" and ADMIN_EMAIL and ADMIN_EMAIL_PASSWORD:
            try:
                msg = MIMEMultipart()
                msg['From'] = ADMIN_EMAIL
                msg['To'] = ADMIN_EMAIL
                msg['Subject'] = "New Client Custom Build Request!"
                body = (
                    f"Client Email: {new_req['user_email']}\n"
                    f"Phone: {new_req['phone']}\n"
                    f"Requirements:\n{new_req['details']}\n"
                    f"Link: {new_req['reference_link']}"
                )
                msg.attach(MIMEText(body, 'plain'))
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(ADMIN_EMAIL, ADMIN_EMAIL_PASSWORD)
                server.send_message(msg)
                server.quit()
            except Exception as e:
                print(f"Email failed to send. Reason: {e}")

        return jsonify({"message": "Saved successfully"}), 201

    except Exception as server_error:
        print(f"CRITICAL SERVER ERROR: {server_error}")
        return jsonify({"error": str(server_error)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
