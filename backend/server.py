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
withdrawals_collection = db['withdrawals']

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

class UserUpdate(BaseModel):
    name: Optional[str] = None
    university: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class NoteUpload(BaseModel):
    title: str
    university: str
    course_code: str
    book_reference: Optional[str] = None
    description: Optional[str] = None
    price: float = 0.0

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    university: Optional[str] = None
    course_code: Optional[str] = None
    book_reference: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None

class NoteAccess(BaseModel):
    note_id: str
    payment_method: str = "paypal"

class NoteComment(BaseModel):
    note_id: str
    comment: str
    rating: int = Field(ge=1, le=5)

class WithdrawalRequest(BaseModel):
    amount: float
    payment_method: str = "generic"

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
            raise HTTPException(status_code=401, detail="Ogiltiga autentiseringsuppgifter")
        user = users_collection.find_one({"email": email})
        if user is None:
            raise HTTPException(status_code=401, detail="Användare hittades inte")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Ogiltiga autentiseringsuppgifter")

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
        return f"Fel vid textextraktion: {str(e)}"

def mock_ai_summarize(text: str) -> str:
    """Mock AI summarization"""
    summaries = [
        "Detta dokument täcker viktiga begrepp inom datavetenskap inklusive algoritmer, datastrukturer och beräkningskomplexitet. Huvudämnen inkluderar sorteringsalgoritmer, grafteori och Big O-notation.",
        "Materialet fokuserar på matematiska grunder med betoning på linjär algebra, kalkyl och sannolikhetsteori. Viktiga områden som täcks är matrisoperationer, derivator och statistiska fördelningar.",
        "Denna studiehandledning täcker grundläggande programmeringsbegrepp inklusive objektorienterad programmering, designmönster och mjukvaruutvecklingsprinciper. Viktiga ämnen inkluderar arv, polymorfism och SOLID-principer.",
        "Innehållet utforskar databassystem och datahantering, täcker SQL-operationer, databasdesign och normalisering. Nyckelbegrepp inkluderar relationell algebra, transaktioner och indexeringsstrategier.",
        "Detta dokument ger en översikt av nätverksgrunder inklusive protokoll, nätverksarkitekturer och säkerhetsprinciper. Huvudämnen täcker TCP/IP, routing och kryptografiska metoder."
    ]
    return random.choice(summaries)

def mock_ai_flashcards(text: str) -> List[dict]:
    """Mock AI flashcard generation"""
    flashcards = [
        {"question": "Vad är Big O-notation?", "answer": "En matematisk notation som används för att beskriva det gränsande beteendet hos en funktion när argumentet tenderar mot ett särskilt värde eller oändlighet."},
        {"question": "Vad är ett binärt sökträd?", "answer": "En trädstruktur där varje nod har högst två barn, och det vänstra barnet är mindre än föräldern medan det högra barnet är större."},
        {"question": "Vad är polymorfism?", "answer": "Förmågan hos objekt av olika typer att behandlas som objekt av en gemensam bastyp, samtidigt som de behåller sina specifika beteenden."},
        {"question": "Vad är normalisering i databaser?", "answer": "Processen att strukturera en relationsdatabas för att minska dataredundans och förbättra dataintegritet."},
        {"question": "Vad är TCP/IP?", "answer": "En uppsättning kommunikationsprotokoll som används för att sammankoppla nätverksenheter på internet och andra datornätverk."}
    ]
    return random.sample(flashcards, min(3, len(flashcards)))

def mock_ai_quiz(text: str) -> List[dict]:
    """Mock AI quiz generation"""
    quizzes = [
        {
            "question": "Vilken sorteringsalgoritm har den bästa genomsnittliga tidskomplexiteten?",
            "options": ["Bubble Sort", "Quick Sort", "Merge Sort", "Selection Sort"],
            "correct": 2,
            "explanation": "Merge Sort har O(n log n) tidskomplexitet i alla fall, vilket gör den mycket tillförlitlig."
        },
        {
            "question": "Vad är huvudprincipen för objektorienterad programmering?",
            "options": ["Inkapsling", "Arv", "Polymorfism", "Alla ovanstående"],
            "correct": 3,
            "explanation": "OOP bygger på inkapsling, arv och polymorfism som arbetar tillsammans."
        },
        {
            "question": "Vilket SQL-kommando används för att hämta data?",
            "options": ["INSERT", "UPDATE", "DELETE", "SELECT"],
            "correct": 3,
            "explanation": "SELECT är SQL-kommandot som används för att fråga och hämta data från databaser."
        }
    ]
    return random.sample(quizzes, min(2, len(quizzes)))

# Routes
@app.post("/api/register")
async def register(user: UserRegister):
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="E-post redan registrerad")
    
    # Create new user
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "university": user.university,
        "created_at": datetime.utcnow(),
        "purchased_notes": [],
        "earnings": 0.0,
        "withdrawn": 0.0
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
        raise HTTPException(status_code=401, detail="Ogiltig e-post eller lösenord")
    
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

@app.put("/api/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    
    if update_data.name:
        update_fields["name"] = update_data.name
    if update_data.university:
        update_fields["university"] = update_data.university
    
    # Handle password change
    if update_data.current_password and update_data.new_password:
        if not verify_password(update_data.current_password, current_user["password"]):
            raise HTTPException(status_code=400, detail="Felaktigt nuvarande lösenord")
        update_fields["password"] = hash_password(update_data.new_password)
    
    if update_fields:
        users_collection.update_one(
            {"email": current_user["email"]},
            {"$set": update_fields}
        )
    
    return {"message": "Profil uppdaterad framgångsrikt"}

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
        raise HTTPException(status_code=400, detail="Endast PDF-filer är tillåtna")
    
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
        "comments": [],
        "is_deleted": False
    }
    
    notes_collection.insert_one(note_doc)
    
    return {
        "message": "Anteckning uppladdad framgångsrikt",
        "note_id": note_doc["id"],
        "summary": summary,
        "flashcards": flashcards,
        "quiz": quiz
    }

@app.put("/api/note/{note_id}")
async def update_note(note_id: str, update_data: NoteUpdate, current_user: dict = Depends(get_current_user)):
    # Find note
    note = notes_collection.find_one({"id": note_id, "is_deleted": False})
    if not note:
        raise HTTPException(status_code=404, detail="Anteckning hittades inte")
    
    # Check if user owns the note
    if note["uploader_email"] != current_user["email"]:
        raise HTTPException(status_code=403, detail="Inte behörig att redigera denna anteckning")
    
    # Update fields
    update_fields = {}
    if update_data.title is not None:
        update_fields["title"] = update_data.title
    if update_data.university is not None:
        update_fields["university"] = update_data.university
    if update_data.course_code is not None:
        update_fields["course_code"] = update_data.course_code
    if update_data.book_reference is not None:
        update_fields["book_reference"] = update_data.book_reference
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.price is not None:
        update_fields["price"] = update_data.price
    
    if update_fields:
        notes_collection.update_one(
            {"id": note_id},
            {"$set": update_fields}
        )
    
    return {"message": "Anteckning uppdaterad framgångsrikt"}

@app.delete("/api/note/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    # Find note
    note = notes_collection.find_one({"id": note_id, "is_deleted": False})
    if not note:
        raise HTTPException(status_code=404, detail="Anteckning hittades inte")
    
    # Check if user owns the note
    if note["uploader_email"] != current_user["email"]:
        raise HTTPException(status_code=403, detail="Inte behörig att ta bort denna anteckning")
    
    # Soft delete - mark as deleted but keep for existing buyers
    notes_collection.update_one(
        {"id": note_id},
        {"$set": {"is_deleted": True}}
    )
    
    return {"message": "Anteckning borttagen framgångsrikt"}

@app.get("/api/search-notes")
async def search_notes(
    university: Optional[str] = None,
    course_code: Optional[str] = None,
    book_reference: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 20
):
    query = {"is_deleted": False}
    
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
        note.pop("is_deleted", None)
    
    return {"notes": notes}

@app.get("/api/note/{note_id}")
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    # For purchased notes, allow access even if deleted
    note = notes_collection.find_one({"id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Anteckning hittades inte")
    
    # If note is deleted, only allow access to owner and purchasers
    if note.get("is_deleted", False):
        if note["uploader_email"] != current_user["email"] and note_id not in current_user.get("purchased_notes", []):
            raise HTTPException(status_code=404, detail="Anteckning hittades inte")
    
    # Check if user has access (is owner or has purchased)
    has_access = (
        note["uploader_email"] == current_user["email"] or
        note_id in current_user.get("purchased_notes", []) or
        note["price"] == 0.0
    )
    
    # Remove sensitive data
    note.pop("_id", None)
    note.pop("is_deleted", None)
    if not has_access:
        note.pop("file_path", None)
        note["access_required"] = True
    
    return note

@app.post("/api/purchase-note")
async def purchase_note(purchase: NoteAccess, current_user: dict = Depends(get_current_user)):
    note = notes_collection.find_one({"id": purchase.note_id, "is_deleted": False})
    if not note:
        raise HTTPException(status_code=404, detail="Anteckning hittades inte")
    
    # Check if already purchased
    if purchase.note_id in current_user.get("purchased_notes", []):
        raise HTTPException(status_code=400, detail="Anteckning redan köpt")
    
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
        "message": "Köp framgångsrikt",
        "payment_id": payment_doc["id"],
        "amount": note["price"]
    }

@app.post("/api/comment-note")
async def comment_note(comment: NoteComment, current_user: dict = Depends(get_current_user)):
    note = notes_collection.find_one({"id": comment.note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Anteckning hittades inte")
    
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
    
    return {"message": "Kommentar tillagd framgångsrikt"}

@app.get("/api/my-notes")
async def get_my_notes(current_user: dict = Depends(get_current_user)):
    # Include both active and deleted notes for owner
    notes = list(notes_collection.find({"uploader_email": current_user["email"]}))
    for note in notes:
        note.pop("_id", None)
        note.pop("file_path", None)
    return {"notes": notes}

@app.get("/api/my-purchases")
async def get_my_purchases(current_user: dict = Depends(get_current_user)):
    purchased_note_ids = current_user.get("purchased_notes", [])
    # Allow access to purchased notes even if deleted
    notes = list(notes_collection.find({"id": {"$in": purchased_note_ids}}))
    
    # Sort by purchase date (get from payments collection)
    payments = list(payments_collection.find(
        {"buyer_email": current_user["email"], "status": "completed"}
    ).sort("created_at", -1))
    
    # Create a map of note_id to purchase date
    purchase_dates = {p["note_id"]: p["created_at"] for p in payments}
    
    # Add purchase date to notes and sort
    for note in notes:
        note.pop("_id", None)
        note.pop("is_deleted", None)
        note["purchase_date"] = purchase_dates.get(note["id"], datetime.utcnow())
    
    # Sort by purchase date (most recent first)
    notes.sort(key=lambda x: x["purchase_date"], reverse=True)
    
    return {"notes": notes}

@app.get("/api/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    # Get withdrawal history
    withdrawals = list(withdrawals_collection.find({"user_email": current_user["email"]}))
    total_withdrawn = sum(w["amount"] for w in withdrawals if w["status"] == "completed")
    
    user_data = {
        "email": current_user["email"],
        "name": current_user["name"],
        "university": current_user["university"],
        "earnings": current_user.get("earnings", 0.0),
        "withdrawn": total_withdrawn,
        "available_balance": current_user.get("earnings", 0.0) - total_withdrawn,
        "notes_uploaded": notes_collection.count_documents({"uploader_email": current_user["email"]}),
        "notes_purchased": len(current_user.get("purchased_notes", [])),
        "can_withdraw": (current_user.get("earnings", 0.0) - total_withdrawn) >= 150.0
    }
    return user_data

@app.post("/api/withdraw")
async def request_withdrawal(withdrawal: WithdrawalRequest, current_user: dict = Depends(get_current_user)):
    # Check available balance
    withdrawals = list(withdrawals_collection.find({"user_email": current_user["email"]}))
    total_withdrawn = sum(w["amount"] for w in withdrawals if w["status"] == "completed")
    available_balance = current_user.get("earnings", 0.0) - total_withdrawn
    
    if withdrawal.amount > available_balance:
        raise HTTPException(status_code=400, detail="Otillräckligt saldo")
    
    if withdrawal.amount < 150.0:
        raise HTTPException(status_code=400, detail="Minsta uttagsbelopp är 150 kr")
    
    # Create withdrawal request
    withdrawal_doc = {
        "id": str(uuid.uuid4()),
        "user_email": current_user["email"],
        "amount": withdrawal.amount,
        "payment_method": withdrawal.payment_method,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "processed_at": None
    }
    
    withdrawals_collection.insert_one(withdrawal_doc)
    
    # For demo purposes, immediately approve the withdrawal
    withdrawals_collection.update_one(
        {"id": withdrawal_doc["id"]},
        {"$set": {"status": "completed", "processed_at": datetime.utcnow()}}
    )
    
    return {
        "message": "Uttagsförfrågan skickad framgångsrikt",
        "withdrawal_id": withdrawal_doc["id"],
        "amount": withdrawal.amount,
        "status": "completed"
    }

@app.get("/api/withdrawals")
async def get_withdrawals(current_user: dict = Depends(get_current_user)):
    withdrawals = list(withdrawals_collection.find(
        {"user_email": current_user["email"]}
    ).sort("created_at", -1))
    
    for withdrawal in withdrawals:
        withdrawal.pop("_id", None)
    
    return {"withdrawals": withdrawals}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)