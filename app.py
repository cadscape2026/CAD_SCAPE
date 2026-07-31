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
# SECURE: This now pulls the string from Render's environment variables.
# It prevents your password from being exposed on GitHub.
MONGO_URI = os.getenv("MONGO_URI")

# Initialize MongoDB Client
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client['procad_db'] # This creates a database named 'procad_db'

# Define the collections
products_collection = db['products']
requests_collection = db['custom_requests']

# Helper function to convert MongoDB documents to a format the frontend can read
def format_product(doc):
    return {
        "id": str(doc["_id"]), # Converts MongoDB's special ObjectId to a standard string
        "name": doc.get("name"),
        "price": doc.get("price", 0.0),
        "image_url": doc.get("image_url"),
        "download_url": doc.get("download_url")
    }

# --- API Endpoints ---

@app.route('/api/products', methods=['GET'])
def get_products():
    """Fetch all products for the marketplace."""
    products = []
    # Find all documents in the products collection
    for doc in products_collection.find():
        products.append(format_product(doc))
    return jsonify(products), 200

@app.route('/api/products', methods=['POST'])
def add_product():
    """Admin route to upload a new CAD project."""
    data = request.json
    
    # In production, verify the user's role via token here before proceeding
    
    new_product = {
        "name": data.get('name'),
        "price": float(data.get('price', 0)),
        "image_url": data.get('image_url'),
        "download_url": data.get('download_url')
    }
    
    # Insert the new product into the database
    result = products_collection.insert_one(new_product)
    
    # Attach the newly generated ID to the response
    created_product = format_product({**new_product, "_id": result.inserted_id})
    
    return jsonify({"message": "Product added successfully", "product": created_product}), 201

@app.route('/api/requests', methods=['POST'])
def submit_request():
    """Handle custom CAD design requests from the public."""
    data = request.json
    
    new_req = {
        "details": data.get('details'),
        "reference_link": data.get('reference_link'),
        "user_email": data.get('user_email', 'guest@example.com')
    }
    
    # Insert the request into the database
    requests_collection.insert_one(new_req)
    
    return jsonify({"message": "Custom request submitted successfully"}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)