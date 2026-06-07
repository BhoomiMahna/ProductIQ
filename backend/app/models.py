from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    url = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    insights = relationship("ProductInsight", back_populates="product", uselist=False, cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    text = Column(Text, nullable=False)
    rating = Column(Float, nullable=True)
    date = Column(DateTime, nullable=True)
    
    # ML Generated fields
    sentiment_label = Column(String, nullable=True)  # Positive, Negative, Neutral
    sentiment_score = Column(Float, nullable=True)
    aspects = Column(JSON, nullable=True)  # e.g. {"battery": "positive", "camera": "negative"}
    cluster_id = Column(Integer, nullable=True)
    cluster_label = Column(String, nullable=True)
    is_suspicious = Column(Integer, default=0) # 0 = genuine, 1 = suspicious

    product = relationship("Product", back_populates="reviews")


class ProductInsight(Base):
    __tablename__ = "product_insights"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True)
    
    overall_sentiment_score = Column(Float, nullable=True)
    suspicious_percentage = Column(Float, nullable=True)
    top_pros = Column(JSON, nullable=True)  # List of strings
    top_cons = Column(JSON, nullable=True)  # List of strings
    complaint_clusters = Column(JSON, nullable=True) # Dict of clusters
    ai_summary = Column(Text, nullable=True)

    product = relationship("Product", back_populates="insights")
