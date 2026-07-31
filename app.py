from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
# Enable CORS so the HTML/JS frontend can communicate with this API
CORS(app)

# --- Database & Config (MongoDB Atlas) ---
MONGO_URI = os.getenv("MONGO_URI")

# Email credentials for Admin Notifications (Set these in Render later)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") 
ADMIN_EMAIL_PASSWORD = os.getenv("ADMIN_EMAIL_PASSWORD")

# Initialize MongoDB Client
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client['procad_db'] 

# Define the collections
products_collection = db['products']
comments_collection = db['comments']
requests_collection = db['custom_requests']

def format_product(doc):
    prod_id = str(doc["_id"])
    comments_cursor = comments_collection.find({"product_id": prod_id})
    comments = []
    for c in comments_cursor:
        comments.append({
            "id": str(c["_id"]),
            "user_name": c.get("user_name"),
            "text": c.get("text")
        })
    return {
        "id": prod_id,
        "name": doc.get("name"),
        "description": doc.get("description", ""),
        "price": doc.get("price", 0.0),
        "image_url": doc.get("image_url"),
        "download_url": doc.get("download_url"),
        "comments": comments
    }

# --- API Endpoints ---

@app.route('/api/products', methods=['GET'])
def get_products():
    products = []
    for doc in products_collection.find():
        products.append(format_product(doc))
    return jsonify(products), 200

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    new_product = {
        "name": data.get('name'),
        "description": data.get('description', ''),
        "price": float(data.get('price', 0)),
        "image_url": data.get('image_url'),
        "download_url": data.get('download_url')
    }
    products_collection.insert_one(new_product)
    return jsonify({"message": "Product added successfully"}), 201

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    """Admin route to edit an existing product."""
    data = request.json
    try:
        updated_data = {
            "name": data.get('name'),
            "description": data.get('description', ''),
            "price": float(data.get('price', 0)),
            "image_url": data.get('image_url'),
            "download_url": data.get('download_url')
        }
        products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": updated_data})
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Admin route to delete a product and its comments."""
    try:
        products_collection.delete_one({"_id": ObjectId(product_id)})
        comments_collection.delete_many({"product_id": product_id})
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/comments', methods=['POST'])
def add_comment():
    data = request.json
    new_comment = {
        "product_id": data.get('product_id'),
        "user_name": data.get('user_name', 'Guest'),
        "text": data.get('text')
    }
    comments_collection.insert_one(new_comment)
    return jsonify({"message": "Comment added successfully"}), 201

# --- NEW/UPDATED: Custom Requests Logic ---

@app.route('/api/requests', methods=['GET'])
def get_requests():
    """Admin route to view incoming requests."""
    reqs = []
    for doc in requests_collection.find():
        reqs.append({
            "id": str(doc["_id"]),
            "user_email": doc.get("user_email"),
            "phone": doc.get("phone", "N/A"),
            "details": doc.get("details"),
            "reference_link": doc.get("reference_link", "None provided")
        })
    # Return in reverse order so newest are first
    return jsonify(reqs[::-1]), 200

@app.route('/api/requests', methods=['POST'])
def submit_request():
    """Handle custom CAD design requests from the public and email Admin."""
    data = request.json
    
    new_req = {
        "details": data.get('details'),
        "reference_link": data.get('reference_link', ''),
        "phone": data.get('phone', ''),
        "user_email": data.get('user_email', 'guest@example.com')
    }
    
    requests_collection.insert_one(new_req)

    # Automatically send email to Admin
    if ADMIN_EMAIL and ADMIN_EMAIL_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg['From'] = ADMIN_EMAIL
            msg['To'] = ADMIN_EMAIL
            msg['Subject'] = "New CAD Design Request Received!"
            
            body = f"""You have a new client request for a custom build:
            
Client Email: {new_req['user_email']}
Phone/WhatsApp: {new_req['phone']}

Requirements: 
{new_req['details']}

Reference/Drive Link: {new_req['reference_link']}
            """
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(ADMIN_EMAIL, ADMIN_EMAIL_PASSWORD)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            print("Email failed to send. Error:", e)

    return jsonify({"message": "Custom request submitted successfully"}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
