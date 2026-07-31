from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
import os

app = Flask(__name__)
# Enable CORS so the HTML/JS frontend can communicate with this API
CORS(app)

# --- Database Configuration (MongoDB Atlas) ---
# Pulls the secure connection string from Render's Environment Variables
MONGO_URI = os.getenv("MONGO_URI")

# Initialize MongoDB Client
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client['procad_db'] 

# Define the collections
products_collection = db['products']
comments_collection = db['comments']
requests_collection = db['custom_requests']

# Helper function to format products and fetch their comments
def format_product(doc):
    prod_id = str(doc["_id"])
    
    # Fetch all comments matching this product's ID
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
    """Fetch all products and their comments for the marketplace."""
    products = []
    for doc in products_collection.find():
        products.append(format_product(doc))
    return jsonify(products), 200

@app.route('/api/products', methods=['POST'])
def add_product():
    """Admin route to upload a new CAD project."""
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

@app.route('/api/comments', methods=['POST'])
def add_comment():
    """Handle new community comments."""
    data = request.json
    
    new_comment = {
        "product_id": data.get('product_id'),
        "user_name": data.get('user_name', 'Guest'),
        "text": data.get('text')
    }
    
    comments_collection.insert_one(new_comment)
    return jsonify({"message": "Comment added successfully"}), 201

@app.route('/api/requests', methods=['POST'])
def submit_request():
    """Handle custom CAD design requests from the public."""
    data = request.json
    
    new_req = {
        "details": data.get('details'),
        "reference_link": data.get('reference_link'),
        "user_email": data.get('user_email', 'guest@example.com')
    }
    
    requests_collection.insert_one(new_req)
    return jsonify({"message": "Custom request submitted successfully"}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
