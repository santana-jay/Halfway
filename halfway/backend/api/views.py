from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import googlemaps
import google.generativeai as gemini
from google import genai
from django.conf import settings
import json
from django.http import HttpResponse, JsonResponse
import logging

# Set up logging
logger = logging.getLogger(__name__)



def index(request):
    return JsonResponse({'message': 'Halfway API is running!'})


class MidpointView(APIView):
    def get(self, request):
        # Return a simple response for GET requests to test the endpoint
        return Response({
            "message": "Midpoint API is working! Use POST to calculate the midpoint between two addresses.",
            "usage": {
                "method": "POST",
                "data": {
                    "address1": "First address",
                    "address2": "Second address"
                }
            }
        })
    

class MidpointView(APIView):
    def post(self, request):
        print("Received request:", request.data)

        # Get address from request
        try:
            address1 = request.data.get('address1')
            address2 = request.data.get('address2')

            if not address1 or not address2:
                return Response({"error": "Both address1 and address2 are required."}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Processing addresses: {address1}, {address2}")
            
            # Initialize Google Maps client
            gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

            # Geocode the addresses
            try:
                geocode1 = gmaps.geocode(address1)
                geocode2 = gmaps.geocode(address2)
            except Exception as e:
                logger.error(f"Google Maps Geocoding Error: {str(e)}")
                return Response({'error': f'Google Maps Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
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
            try:
                reverse_geocode = gmaps.reverse_geocode((mid_lat, mid_lng))
                midpoint_address = reverse_geocode[0]['formatted_address'] if reverse_geocode else "Unknown address"
            except Exception as e:
                logger.error(f'Reverse Geocoding Error: {str(e)}')
                midpoint_address = "Unknown address. Lookup Failed."


            # Get suggestions from Google Generative AI
            # gemini.configure(key=settings.GOOGLE_GEMINI_API_KEY)
            # model = gemini.GenerativeModel('gemini-pro')

            client = genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)
            # model = client.get_model('gemini-pro')

            # Create a prompt for the model
            prompt = """
                I'm meeting a friend halfway between """ + address1 + """ and """ + address2 + """.
                The midpoint is at """ + midpoint_address + """ (latitude: """ + str(mid_lat) + """, longitude: """ + str(mid_lng) + """).
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
                    {
                        "name": "The Coffee Shop",
                        "description": "A cozy cafe offering specialty coffees and pastries.",
                        "type": "cafe"
                    }
                ]
                """
            

            # response = model.generate_content(prompt)
            # suggestions = json.loads(response.text)
            # if not isinstance(suggestions, list):
            #     return Response({"error": "Failed to get suggestions."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # # Return the midpoint and suggestions
            # return Response({
            #     "midpoint": {
            #     "latitude": mid_lat,
            #     "longitude": mid_lng,
            #     "address": midpoint_address
            #     },
            #     "suggestions": suggestions
            # }, status=status.HTTP_200_OK)

            try:
                response = client.models.generate_content(
                    model='gemini-pro',
                    contents=prompt
                    )
                
                
                # Extract the JSON string from the response text
                # First, let's handle the response properly
                response_text = response.text
                
                # Look for JSON in the response
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                
                if json_match:
                    json_str = json_match.group(0)
                    suggestions = json.loads(json_str)
                else:
                    # If no JSON array is found, create a basic suggestion
                    suggestions = [
                        {
                            "name": "Explore the Area",
                            "description": f"Check out what's available around {midpoint_address}.",
                            "type": "general"
                        }
                    ]
                    
                if not isinstance(suggestions, list):
                    suggestions = [
                        {
                            "name": "Explore the Area",
                            "description": f"Check out what's available around {midpoint_address}.",
                            "type": "general"
                        }
                    ]
            
            except Exception as e:
                    logger.error(f"Gemini API error: {str(e)}")
                    logger.error(f"Gemini API response: {response.text if 'response' in locals() else 'No response'}")
                    
                    # Provide default suggestions if Gemini fails
                    suggestions = [
                        {
                            "name": "Explore the Area",
                            "description": f"Check out what's available around {midpoint_address}.",
                            "type": "general"
                        }
                    ]
                
            # Return the midpoint and suggestions
            return Response({
                "midpoint": {
                    "lat": mid_lat,
                    "lng": mid_lng,
                    "address": midpoint_address
                },
                "suggestions": suggestions
            }, status=status.HTTP_200_OK)
    
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)