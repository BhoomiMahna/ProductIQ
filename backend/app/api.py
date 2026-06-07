from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from . import models, schemas
from .database import get_db
from .ml_pipeline import ml_pipeline

router = APIRouter()

@router.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/products/", response_model=List[schemas.Product])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.post("/products/{product_id}/reviews/upload")
async def upload_reviews(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {e}")

    if 'review' not in df.columns:
        raise HTTPException(status_code=400, detail="CSV must contain a 'review' column")

    reviews_to_add = []
    texts_for_cluster = []
    
    # Process reviews
    for index, row in df.iterrows():
        text = str(row['review'])
        if pd.isna(text) or not text.strip():
            continue
            
        rating = float(row['rating']) if 'rating' in df.columns and pd.notna(row['rating']) else None
        date = pd.to_datetime(row['date']).to_pydatetime() if 'date' in df.columns and pd.notna(row['date']) else None

        # ML processing
        sentiment = ml_pipeline.analyze_sentiment(text)
        aspects = ml_pipeline.extract_aspects(text, sentiment['label'])
        is_suspicious = ml_pipeline.detect_fake_review(text, rating, sentiment['label'])

        db_review = models.Review(
            product_id=product_id,
            text=text,
            rating=rating,
            date=date,
            sentiment_label=sentiment['label'],
            sentiment_score=sentiment['score'],
            aspects=aspects,
            is_suspicious=is_suspicious
        )
        reviews_to_add.append(db_review)
        texts_for_cluster.append(text)

    db.add_all(reviews_to_add)
    db.commit()

    # Clustering Negative Reviews
    negative_reviews = [r.text for r in reviews_to_add if r.sentiment_label == "Negative"]
    clusters = {}
    if len(negative_reviews) > 0:
        clusters, labels = ml_pipeline.cluster_complaints(negative_reviews)

    # Aggregating Insights
    total_reviews = len(reviews_to_add)
    positive_count = sum(1 for r in reviews_to_add if r.sentiment_label == "Positive")
    suspicious_count = sum(1 for r in reviews_to_add if r.is_suspicious == 1)
    
    overall_sentiment_score = (positive_count / total_reviews * 100) if total_reviews > 0 else 0
    suspicious_percentage = (suspicious_count / total_reviews * 100) if total_reviews > 0 else 0

    # Collect Pros and Cons
    pros_counts = {}
    cons_counts = {}
    for r in reviews_to_add:
        for aspect, sent in r.aspects.items():
            if sent == "Positive":
                pros_counts[aspect] = pros_counts.get(aspect, 0) + 1
            else:
                cons_counts[aspect] = cons_counts.get(aspect, 0) + 1

    top_pros = sorted(pros_counts, key=pros_counts.get, reverse=True)[:5]
    top_cons = sorted(cons_counts, key=cons_counts.get, reverse=True)[:5]

    # Generate AI Summary
    summary = ml_pipeline.generate_summary(texts_for_cluster[:20]) # Summarize top 20 to save time

    # Save Insights
    insight = db.query(models.ProductInsight).filter(models.ProductInsight.product_id == product_id).first()
    if not insight:
        insight = models.ProductInsight(product_id=product_id)
        db.add(insight)

    insight.overall_sentiment_score = overall_sentiment_score
    insight.suspicious_percentage = suspicious_percentage
    insight.top_pros = top_pros
    insight.top_cons = top_cons
    insight.complaint_clusters = clusters
    insight.ai_summary = summary

    db.commit()

    return {"message": f"Successfully processed {len(reviews_to_add)} reviews", "insights_generated": True}

@router.get("/products/{product_id}/insights", response_model=schemas.ProductInsight)
def get_insights(product_id: int, db: Session = Depends(get_db)):
    insight = db.query(models.ProductInsight).filter(models.ProductInsight.product_id == product_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insights not found for this product")
    return insight

@router.get("/products/{product_id}/reviews", response_model=List[schemas.Review])
def get_reviews(product_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).offset(skip).limit(limit).all()
    return reviews

@router.post("/products/{product_id}/chat", response_model=schemas.ChatResponse)
def chat_with_reviews(product_id: int, request: schemas.ChatRequest, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).all()
    if not reviews:
        raise HTTPException(status_code=404, detail="No reviews found for this product")
        
    review_texts = [r.text for r in reviews if r.text]
    response = ml_pipeline.answer_question(request.question, review_texts)
    
    return schemas.ChatResponse(answer=response["answer"], sources=response["sources"])

@router.get("/products/compare")
def compare_products(id1: int, id2: int, db: Session = Depends(get_db)):
    insight1 = db.query(models.ProductInsight).filter(models.ProductInsight.product_id == id1).first()
    insight2 = db.query(models.ProductInsight).filter(models.ProductInsight.product_id == id2).first()
    
    if not insight1 or not insight2:
        raise HTTPException(status_code=404, detail="One or both products not found or lack insights")
        
    return {
        "product1": {
            "id": id1,
            "overall_sentiment_score": insight1.overall_sentiment_score,
            "suspicious_percentage": insight1.suspicious_percentage,
            "top_pros": insight1.top_pros,
            "top_cons": insight1.top_cons,
        },
        "product2": {
            "id": id2,
            "overall_sentiment_score": insight2.overall_sentiment_score,
            "suspicious_percentage": insight2.suspicious_percentage,
            "top_pros": insight2.top_pros,
            "top_cons": insight2.top_cons,
        }
    }
