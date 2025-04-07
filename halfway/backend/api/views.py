from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import googlemaps
import google.generativeai as gemini
from google import genai
from django.conf import settings
import json
from django.http import HttpResponse, JsonResponse


def index(request):
    return JsonResponse({'message': 'Halfway API is running!'})


class MidpointView(APIView):
    def post(self, request):
        # Get address from request
        address1 = request.data.get('address1')
        address2 = request.data.get('address2')
        if not address1 or not address2:
            return Response({"error": "Both address1 and address2 are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize Google Maps client
        gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

        # Geocode the addresses
        geocode1 = gmaps.geocode(address1)
        geocode2 = gmaps.geocode(address2)
        if not geocode1 or not geocode2:
            return Response({"error": "Could not geocode one or both addresses."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract latitude and longitude
        lat1 = geocode1[0]['geometry']['location']['lat']
        lng1 = geocode1[0]['geometry']['location']['lng']
        lat2 = geocode2[0]['geometry']['location']['lat']
        lng2 = geocode2[0]['geometry']['location']['lng']

        # Calculate midpoint
        mid_lat = (lat1 + lat2) / 2
        mid_lng = (lng1 + lng2) / 2
        midpoint = {'latitude': mid_lat, 'longitude': mid_lng}

        # Resverse Geocode the midpoint to get a readable address
        reverse_geocode = gmaps.reverse_geocode((mid_lat, mid_lng))
        midpoint_address = reverse_geocode[0]['formatted_address'] if reverse_geocode else "Unknown address"

        # Get suggestions from Google Generative AI
        gemini.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
        model = gemini.GenerativeModel('gemini-pro')

        prompt = f"""
        I'm meeting a friend halfway between {address1} and {address2}.
        The midpoint is at {midpoint_address} (latitude: {mid_lat}, longitude: {mid_lng}).
        Please suggest 10 interesting things to do in this area. Include a mix of activities, such as restaurants or cafes, parks, and attractions.
        Respond in a JSON format with an array of objects that have name, description, and type properties.
        Each object should represent a different suggestion.
        Example:
        [
            {
                "name": "Central Park",
                "description": "A large public park in New York City.",
                "type": "park"
            },
            ...
        ]
        """

        response = model.generate_content(prompt)
        suggestions = json.loads(response.text)
        if not isinstance(suggestions, list):
            return Response({"error": "Failed to get suggestions."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Return the midpoint and suggestions
        return Response({
            "midpoint": {
            "latitude": mid_lat,
            "longitude": mid_lng,
            "address": midpoint_address
            },
            "suggestions": suggestions
        }, status=status.HTTP_200_OK)
