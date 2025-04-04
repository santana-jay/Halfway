from django.urls import path
from . import views

urlpatterns = [
    # Define your URL patterns here
    # Example:
    # path('example/', views.example_view, name='example'),
    path('midpoint/', views.MidpointView.as_view(), name='midpoint'),
]