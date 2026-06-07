import os
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

class MLPipeline:
    def __init__(self):
        print("Loading ML models...")
        # 1. Sentiment Analysis
        self.sentiment_model = pipeline(
            "sentiment-analysis",
            model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
        )
        
        # 2. Aspect Extraction (Keywords approach for speed)
        self.aspects = ["battery", "camera", "display", "performance", "build", "charging", "price", "software", "heating"]
        
        # 3. Complaint Clustering
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # 4. Summarization
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        self.summary_model_name = "sshleifer/distilbart-cnn-12-6"
        self.summary_tokenizer = AutoTokenizer.from_pretrained(self.summary_model_name)
        self.summary_model = AutoModelForSeq2SeqLM.from_pretrained(self.summary_model_name)
        # 5. RAG Chatbot Generative Model
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        self.rag_model_name = "google/flan-t5-small"
        self.rag_tokenizer = AutoTokenizer.from_pretrained(self.rag_model_name)
        self.rag_model = AutoModelForSeq2SeqLM.from_pretrained(self.rag_model_name)
        print("ML models loaded successfully.")

    def analyze_sentiment(self, text: str):
        result = self.sentiment_model(text[:512])[0]
        label = result['label'] # POSITIVE or NEGATIVE
        score = result['score']
        return {
            "label": "Positive" if label == "POSITIVE" else "Negative",
            "score": score
        }

    def detect_fake_review(self, text: str, rating: float, sentiment_label: str) -> int:
        # Heuristic for fake review detection
        text_lower = text.lower()
        word_count = len(text.split())
        
        # Condition 1: Extremely short and generic 5-star or 1-star review
        if word_count < 3 and rating in [1.0, 5.0]:
            return 1
            
        # Condition 2: Rating and sentiment mismatch
        if rating == 5.0 and sentiment_label == "Negative":
            return 1
        if rating == 1.0 and sentiment_label == "Positive":
            return 1
            
        # Condition 3: Spammy keywords
        spam_keywords = ["buy this now", "click here", "best product ever", "get paid", "earn money"]
        for keyword in spam_keywords:
            if keyword in text_lower:
                return 1
                
        return 0

    def extract_aspects(self, text: str, sentiment_label: str):
        text_lower = text.lower()
        found_aspects = {}
        for aspect in self.aspects:
            if aspect in text_lower:
                found_aspects[aspect] = sentiment_label
        return found_aspects

    def cluster_complaints(self, reviews: list[str], num_clusters: int = 3):
        if not reviews:
            return {}
        
        embeddings = self.embedding_model.encode(reviews)
        n_clusters = min(num_clusters, len(reviews))
        if n_clusters == 0:
            return {}
            
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        clusters = {}
        for i in range(n_clusters):
            cluster_reviews = [reviews[j] for j in range(len(reviews)) if cluster_labels[j] == i]
            clusters[f"Cluster {i+1}"] = {
                "count": len(cluster_reviews),
                "samples": cluster_reviews[:3]
            }
        
        return clusters, cluster_labels.tolist()

    def generate_summary(self, reviews: list[str]):
        if not reviews:
            return "No reviews available to summarize."
        
        combined_text = " ".join(reviews)
        if len(combined_text) > 1024:
            combined_text = combined_text[:1024]
            
        inputs = self.summary_tokenizer(combined_text, return_tensors="pt", max_length=1024, truncation=True)
        summary_ids = self.summary_model.generate(inputs["input_ids"], max_length=130, min_length=30, do_sample=False)
        summary_text = self.summary_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary_text
        
    def answer_question(self, question: str, reviews: list[str], top_k: int = 3):
        import faiss
        
        if not reviews:
            return {"answer": "I don't have any reviews to base my answer on.", "sources": []}
            
        # 1. Embed reviews
        review_embeddings = self.embedding_model.encode(reviews)
        
        # 2. Build FAISS index
        dimension = review_embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(review_embeddings).astype('float32'))
        
        # 3. Search
        question_embedding = self.embedding_model.encode([question])
        distances, indices = index.search(np.array(question_embedding).astype('float32'), min(top_k, len(reviews)))
        
        relevant_reviews = [reviews[i] for i in indices[0] if i < len(reviews)]
        
        # 4. Generate Answer
        context = " ".join(relevant_reviews)
        prompt = f"Answer the following question based on the customer reviews provided. Context: {context} Question: {question}"
        
        inputs = self.rag_tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        outputs = self.rag_model.generate(inputs["input_ids"], max_length=150, num_beams=4, early_stopping=True)
        answer = self.rag_tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        return {
            "answer": answer,
            "sources": relevant_reviews
        }

ml_pipeline = MLPipeline()
