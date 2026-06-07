from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ReviewBase(BaseModel):
    text: str
    rating: Optional[float] = None
    date: Optional[datetime] = None

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    product_id: int
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    aspects: Optional[Dict[str, str]] = None
    cluster_id: Optional[int] = None
    cluster_label: Optional[str] = None
    is_suspicious: Optional[int] = 0

    class Config:
        orm_mode = True

class ProductInsightBase(BaseModel):
    overall_sentiment_score: Optional[float] = None
    suspicious_percentage: Optional[float] = None
    top_pros: Optional[List[str]] = None
    top_cons: Optional[List[str]] = None
    complaint_clusters: Optional[Dict[str, Any]] = None
    ai_summary: Optional[str] = None

class ProductInsight(ProductInsightBase):
    id: int
    product_id: int

    class Config:
        orm_mode = True

class ProductBase(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime
    insights: Optional[ProductInsight] = None

    class Config:
        orm_mode = True

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
