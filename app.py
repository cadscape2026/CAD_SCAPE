from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'cadscape.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Models ---
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True) # Added Description
    price = db.Column(db.Float, default=0.0)
    image_url = db.Column(db.String(500), nullable=False)
    download_url = db.Column(db.String(500), nullable=False)
    comments = db.relationship('Comment', backref='product', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "image_url": self.image_url,
            "download_url": self.download_url,
            "comments": [c.to_dict() for c in self.comments]
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    user_name = db.Column(db.String(150), nullable=False)
    text = db.Column(db.Text, nullable=False)
    
    def to_dict(self):
        return {"id": self.id, "user_name": self.user_name, "text": self.text}

class CustomRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    details = db.Column(db.Text, nullable=False)
    reference_link = db.Column(db.String(500))
    user_email = db.Column(db.String(150), nullable=False)

with app.app_context():
    db.create_all()

# --- API Endpoints ---
@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products]), 200

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    new_product = Product(
        name=data.get('name'),
        description=data.get('description', ''),
        price=float(data.get('price', 0)),
        image_url=data.get('image_url'),
        download_url=data.get('download_url')
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"message": "Product added successfully"}), 201

@app.route('/api/comments', methods=['POST'])
def add_comment():
    data = request.json
    new_comment = Comment(
        product_id=data.get('product_id'),
        user_name=data.get('user_name', 'Guest'),
        text=data.get('text')
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify({"message": "Comment added successfully"}), 201

@app.route('/api/requests', methods=['POST'])
def submit_request():
    data = request.json
    new_req = CustomRequest(
        details=data.get('details'),
        reference_link=data.get('reference_link'),
        user_email=data.get('user_email', 'guest@example.com')
    )
    db.session.add(new_req)
    db.session.commit()
    return jsonify({"message": "Custom request submitted successfully"}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
