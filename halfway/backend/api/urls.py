from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),  # Home page
    path('midpoint/', views.MidpointView.as_view(), name='midpoint'),
]