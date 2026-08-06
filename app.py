from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime

app = Flask(__name__)
CORS(app)

# --- Database & Config ---
MONGO_URI = os.getenv("MONGO_URI")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") 
ADMIN_EMAIL_PASSWORD = os.getenv("ADMIN_EMAIL_PASSWORD")

client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client['procad_db'] 

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
        "image_url": doc.get("image_url", ""),
        "download_url": doc.get("download_url", ""),
        "model_3d_url": doc.get("model_3d_url", ""),
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
        "image_url": data.get('image_url', ''),
        "download_url": data.get('download_url', ''),
        "model_3d_url": data.get('model_3d_url', '') 
    }
    products_collection.insert_one(new_product)
    return jsonify({"message": "Product added successfully"}), 201

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json
    try:
        updated_data = {
            "name": data.get('name'),
            "description": data.get('description', ''),
            "price": float(data.get('price', 0)),
            "image_url": data.get('image_url', ''),
            "download_url": data.get('download_url', ''),
            "model_3d_url": data.get('model_3d_url', '')
        }
        products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": updated_data})
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
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

@app.route('/api/requests', methods=['GET'])
def get_requests():
    reqs = []
    for doc in requests_collection.find():
        reqs.append({
            "id": str(doc["_id"]),
            "req_type": doc.get("req_type", "Custom Design"),
            "user_email": doc.get("user_email"),
            "phone": doc.get("phone", "N/A"),
            "details": doc.get("details"),
            "reference_link": doc.get("reference_link", ""),
            "status": doc.get("status", "Pending"),
            "price": doc.get("price", 0.0),
            "payment_status": doc.get("payment_status", "Unpaid"),
            "completed_link": doc.get("completed_link", ""),
            "completed_image": doc.get("completed_image", ""),
            "created_at": doc.get("created_at", "") # Fetches timestamp
        })
    return jsonify(reqs[::-1]), 200

@app.route('/api/requests/<req_id>', methods=['PUT', 'OPTIONS'])
def update_request_status(req_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data = request.json
        update_fields = {}
        if 'status' in data: update_fields['status'] = data['status']
        if 'payment_status' in data: update_fields['payment_status'] = data['payment_status']
        if 'price' in data: update_fields['price'] = float(data['price'])
        if 'completed_link' in data: update_fields['completed_link'] = data['completed_link']
        if 'completed_image' in data: update_fields['completed_image'] = data['completed_image'] 

        requests_collection.update_one({"_id": ObjectId(req_id)}, {"$set": update_fields})
        return jsonify({"message": "Order updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/requests', methods=['POST', 'OPTIONS'])
def submit_request():
    if request.method == 'OPTIONS':
        return jsonify({}), 200 
    
    try:
        data = request.json
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
            "created_at": datetime.datetime.utcnow().isoformat() # Timestamps the exact second
        }
        
        requests_collection.insert_one(new_req)

        if new_req["req_type"] == "Custom Design" and ADMIN_EMAIL and ADMIN_EMAIL_PASSWORD:
            try:
                msg = MIMEMultipart()
                msg['From'] = ADMIN_EMAIL
                msg['To'] = ADMIN_EMAIL
                msg['Subject'] = "New Client Custom Build Request!"
                body = f"Client Email: {new_req['user_email']}\nPhone: {new_req['phone']}\nRequirements:\n{new_req['details']}\nLink: {new_req['reference_link']}"
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
