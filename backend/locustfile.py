import time
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(5, 15)

    @task
    def index(self):
        self.client.get("/health")

    @task(3)
    def get_lawyers(self):
        self.client.get("/api/v1/lawyers")

    @task(2)
    def get_documents(self):
        self.client.get("/api/v1/documents")
