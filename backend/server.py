from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional
import pymongo
from pymongo import MongoClient
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
import uuid
import json
import shutil
import PyPDF2
import random
import time

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client['student_platform']
users_collection = db['users']
notes_collection = db['notes']
payments_collection = db['payments']

# Create uploads directory
os.makedirs('/app/uploads', exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

# JWT settings
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    university: str

class UserLogin(BaseModel):
    email: str
    password: str

class NoteUpload(BaseModel):
    title: str
    university: str
    course_code: str
    book_reference: Optional[str] = None
    description: Optional[str] = None
    price: float = 0.0

class NoteAccess(BaseModel):
    note_id: str
    payment_method: str = "paypal"

class NoteComment(BaseModel):
    note_id: str
    comment: str
    rating: int = Field(ge=1, le=5)

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = users_collection.find_one({"email": email})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def extract_pdf_text(file_path: str) -> str:
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        return f"Error extracting text: {str(e)}"

def mock_ai_summarize(text: str) -> str:
    """Mock AI summarization"""
    summaries = [
        "This document covers key concepts in computer science including algorithms, data structures, and computational complexity. Main topics include sorting algorithms, graph theory, and Big O notation.",
        "The material focuses on mathematical foundations with emphasis on linear algebra, calculus, and probability theory. Key areas covered are matrix operations, derivatives, and statistical distributions.",
        "This study guide covers fundamental programming concepts including object-oriented programming, design patterns, and software engineering principles. Important topics include inheritance, polymorphism, and SOLID principles.",
        "The content explores database systems and data management, covering SQL operations, database design, and normalization. Key concepts include relational algebra, transactions, and indexing strategies.",
        "This document provides an overview of networking fundamentals including protocols, network architectures, and security principles. Major topics cover TCP/IP, routing, and cryptographic methods."
    ]
    return random.choice(summaries)

def mock_ai_flashcards(text: str) -> List[dict]:
    """Mock AI flashcard generation"""
    flashcards = [
        {"question": "What is Big O notation?", "answer": "A mathematical notation used to describe the limiting behavior of a function when the argument tends towards a particular value or infinity."},
        {"question": "What is a binary search tree?", "answer": "A tree data structure where each node has at most two children, and the left child is less than the parent while the right child is greater."},
        {"question": "What is polymorphism?", "answer": "The ability of objects of different types to be treated as objects of a common base type, while still maintaining their specific behaviors."},
        {"question": "What is normalization in databases?", "answer": "The process of structuring a relational database to reduce data redundancy and improve data integrity."},
        {"question": "What is TCP/IP?", "answer": "A suite of communication protocols used to interconnect network devices on the internet and other computer networks."}
    ]
    return random.sample(flashcards, min(3, len(flashcards)))

def mock_ai_quiz(text: str) -> List[dict]:
    """Mock AI quiz generation"""
    quizzes = [
        {
            "question": "Which sorting algorithm has the best average-case time complexity?",
            "options": ["Bubble Sort", "Quick Sort", "Merge Sort", "Selection Sort"],
            "correct": 2,
            "explanation": "Merge Sort has O(n log n) time complexity in all cases, making it very reliable."
        },
        {
            "question": "What is the main principle of object-oriented programming?",
            "options": ["Encapsulation", "Inheritance", "Polymorphism", "All of the above"],
            "correct": 3,
            "explanation": "OOP is built on encapsulation, inheritance, and polymorphism working together."
        },
        {
            "question": "Which SQL command is used to retrieve data?",
            "options": ["INSERT", "UPDATE", "DELETE", "SELECT"],
            "correct": 3,
            "explanation": "SELECT is the SQL command used to query and retrieve data from databases."
        }
    ]
    return random.sample(quizzes, min(2, len(quizzes)))

# Routes
@app.post("/api/register")
async def register(user: UserRegister):
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "university": user.university,
        "created_at": datetime.utcnow(),
        "purchased_notes": [],
        "earnings": 0.0
    }
    
    users_collection.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name,
            "university": user.university
        }
    }

@app.post("/api/login")
async def login(user: UserLogin):
    # Find user
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": db_user["email"],
            "name": db_user["name"],
            "university": db_user["university"]
        }
    }

@app.post("/api/upload-note")
async def upload_note(
    file: UploadFile = File(...),
    title: str = Form(...),
    university: str = Form(...),
    course_code: str = Form(...),
    book_reference: str = Form(None),
    description: str = Form(None),
    price: float = Form(0.0),
    current_user: dict = Depends(get_current_user)
):
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = f"/app/uploads/{filename}"
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract text from PDF
    pdf_text = extract_pdf_text(file_path)
    
    # Generate AI content (mocked)
    time.sleep(1)  # Simulate AI processing time
    summary = mock_ai_summarize(pdf_text)
    flashcards = mock_ai_flashcards(pdf_text)
    quiz = mock_ai_quiz(pdf_text)
    
    # Create note document
    note_doc = {
        "id": str(uuid.uuid4()),
        "title": title,
        "university": university,
        "course_code": course_code,
        "book_reference": book_reference,
        "description": description,
        "price": price,
        "filename": filename,
        "file_path": file_path,
        "uploader_email": current_user["email"],
        "uploader_name": current_user["name"],
        "created_at": datetime.utcnow(),
        "summary": summary,
        "flashcards": flashcards,
        "quiz": quiz,
        "downloads": 0,
        "rating": 0.0,
        "rating_count": 0,
        "comments": []
    }
    
    notes_collection.insert_one(note_doc)
    
    return {
        "message": "Note uploaded successfully",
        "note_id": note_doc["id"],
        "summary": summary,
        "flashcards": flashcards,
        "quiz": quiz
    }

@app.get("/api/search-notes")
async def search_notes(
    university: Optional[str] = None,
    course_code: Optional[str] = None,
    book_reference: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 20
):
    query = {}
    
    if university:
        query["university"] = {"$regex": university, "$options": "i"}
    if course_code:
        query["course_code"] = {"$regex": course_code, "$options": "i"}
    if book_reference:
        query["book_reference"] = {"$regex": book_reference, "$options": "i"}
    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"description": {"$regex": keyword, "$options": "i"}},
            {"summary": {"$regex": keyword, "$options": "i"}}
        ]
    
    notes = list(notes_collection.find(query).limit(limit))
    
    # Remove file paths and format response
    for note in notes:
        note.pop("file_path", None)
        note.pop("_id", None)
    
    return {"notes": notes}

@app.get("/api/note/{note_id}")
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    note = notes_collection.find_one({"id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Check if user has access (is owner or has purchased)
    has_access = (
        note["uploader_email"] == current_user["email"] or
        note_id in current_user.get("purchased_notes", []) or
        note["price"] == 0.0
    )
    
    # Remove sensitive data
    note.pop("_id", None)
    if not has_access:
        note.pop("file_path", None)
        note["access_required"] = True
    
    return note

@app.post("/api/purchase-note")
async def purchase_note(purchase: NoteAccess, current_user: dict = Depends(get_current_user)):
    note = notes_collection.find_one({"id": purchase.note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Check if already purchased
    if purchase.note_id in current_user.get("purchased_notes", []):
        raise HTTPException(status_code=400, detail="Note already purchased")
    
    # Mock PayPal payment processing
    time.sleep(2)  # Simulate payment processing
    
    # Create payment record
    payment_doc = {
        "id": str(uuid.uuid4()),
        "buyer_email": current_user["email"],
        "seller_email": note["uploader_email"],
        "note_id": purchase.note_id,
        "amount": note["price"],
        "commission": note["price"] * 0.3,  # 30% platform commission
        "seller_amount": note["price"] * 0.7,  # 70% to seller
        "payment_method": purchase.payment_method,
        "status": "completed",
        "created_at": datetime.utcnow()
    }
    
    payments_collection.insert_one(payment_doc)
    
    # Update user's purchased notes
    users_collection.update_one(
        {"email": current_user["email"]},
        {"$push": {"purchased_notes": purchase.note_id}}
    )
    
    # Update seller's earnings
    users_collection.update_one(
        {"email": note["uploader_email"]},
        {"$inc": {"earnings": payment_doc["seller_amount"]}}
    )
    
    # Update note download count
    notes_collection.update_one(
        {"id": purchase.note_id},
        {"$inc": {"downloads": 1}}
    )
    
    return {
        "message": "Purchase successful",
        "payment_id": payment_doc["id"],
        "amount": note["price"]
    }

@app.post("/api/comment-note")
async def comment_note(comment: NoteComment, current_user: dict = Depends(get_current_user)):
    note = notes_collection.find_one({"id": comment.note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Add comment
    comment_doc = {
        "id": str(uuid.uuid4()),
        "user_email": current_user["email"],
        "user_name": current_user["name"],
        "comment": comment.comment,
        "rating": comment.rating,
        "created_at": datetime.utcnow()
    }
    
    # Update note with comment and recalculate rating
    notes_collection.update_one(
        {"id": comment.note_id},
        {"$push": {"comments": comment_doc}}
    )
    
    # Recalculate average rating
    updated_note = notes_collection.find_one({"id": comment.note_id})
    ratings = [c["rating"] for c in updated_note["comments"]]
    avg_rating = sum(ratings) / len(ratings)
    
    notes_collection.update_one(
        {"id": comment.note_id},
        {
            "$set": {
                "rating": avg_rating,
                "rating_count": len(ratings)
            }
        }
    )
    
    return {"message": "Comment added successfully"}

@app.get("/api/my-notes")
async def get_my_notes(current_user: dict = Depends(get_current_user)):
    notes = list(notes_collection.find({"uploader_email": current_user["email"]}))
    for note in notes:
        note.pop("_id", None)
        note.pop("file_path", None)
    return {"notes": notes}

@app.get("/api/my-purchases")
async def get_my_purchases(current_user: dict = Depends(get_current_user)):
    purchased_note_ids = current_user.get("purchased_notes", [])
    notes = list(notes_collection.find({"id": {"$in": purchased_note_ids}}))
    for note in notes:
        note.pop("_id", None)
    return {"notes": notes}

@app.get("/api/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    user_data = {
        "email": current_user["email"],
        "name": current_user["name"],
        "university": current_user["university"],
        "earnings": current_user.get("earnings", 0.0),
        "notes_uploaded": notes_collection.count_documents({"uploader_email": current_user["email"]}),
        "notes_purchased": len(current_user.get("purchased_notes", []))
    }
    return user_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)