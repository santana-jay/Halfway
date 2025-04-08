from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import googlemaps  #type: ignore
from google import genai
from django.conf import settings
import json
from django.http import HttpResponse, JsonResponse
import logging
import re

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
        logger.info(f"Received request: {request.data}")

        # Get address from request
        try:
            address1 = request.data.get('address1')
            address2 = request.data.get('address2')
            radius = request.data.get('radius', 5)

            try:
                radius = int(radius)
                if radius < 1:
                    radius = 5
                elif radius > 20:
                    radius = 20
            except (ValueError, TypeError):
                radius = 5


            if not address1 or not address2:
                return Response({"error": "Both address1 and address2 are required."}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Processing addresses: {address1} and {address2} with radius: {radius} miles")
            
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


            try:
                places_result = gmaps.places_nearby(
                    location=(mid_lat, mid_lng),
                    radius=radius * 1069.34,
                    type='point_of_interest',
                    keyword='restaurant|cafe|park|attraction'
                )

                logger.info(f'Found {len(places_result.get('results', []))} nearby places.')

                if places_result and 'results' in places_result and len(places_result['results']) > 0:
                    places = places_result['results'][:10]
                    real_places = []

                    for place in places:
                        place_type = place.get('types', ['unknown'])[0].replace('_', ' ')
                        real_places.append({
                            'name': place.get('name', 'Unknown Place'),
                            'description': place.get('vicinity', 'No description available'),
                            'type': place_type
                        })

                    if real_places:
                        logger.info('Using real places from Google Places API.')
                        return Response({
                            'midpoint': {
                                'lat': mid_lat,
                                'lng': mid_lng,
                                'address': midpoint_address
                            },
                            'suggestions': real_places
                        }, 
                        status=status.HTTP_200_OK
                        )
            except Exception as e:
                logger.error(f'Places API Error: {str(e)}')



            client = genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)
                

                # Create a prompt for the model
            prompt = """
            I need recommendations for things to do near a specific location. Please provide specific, realistic recommendations that would actually exist in this area. 
            
            Location: """ + midpoint_address + """
            Coordinates: Latitude """ + str(mid_lat) + """, Longitude """ + str(mid_lng) + """
            Radius: """ + str(radius) + """ miles
            
            Please suggest 10-12 interesting, diverse things to do in this area. Include a mix of:
            - Parks and outdoor activities
            - Shopping areas or malls
            - Entertainment venues
            - Cultural attractions
            - Local landmarks
            
            Be specific and realistic - these should be actual places that are likely to exist in this area. Must include a minimum of 5 activities like parks, attractions or entertainment venues. There must be a mix of activities.
            For each suggestion, provide:
            1. A name (realistic for the location)
            2. A brief, helpful description (1-2 sentences)
            3. A category/type (e.g., restaurant, park, museum)
            
            Format your response as a JSON array with this exact structure:
            [
                {
                    "name": "Place Name",
                    "description": "Brief description of this place.",
                    "type": "category"
                },
                ...
            ]
            
            Only respond with the JSON array, nothing else.
            """
            


            try:
                response = client.models.generate_content(
                    model='gemini-pro',
                    contents=prompt
                    )
                
                
                # Extract the JSON string from the response text
                # First, let's handle the response properly
                response_text = response.text
                
                # Look for JSON in the response
                
                json_match = re.search(r'\[\s*\{.*\}\s*\]', response_text, re.DOTALL)
                
                if json_match:
                    json_str = json_match.group(0)
                    try:
                        logger.info((f'Found JSON: {json_str[:100]}...'))
                        suggestions = json.loads(json_str)
                        if isinstance(suggestions, list) and len(suggestions) > 0:
                            logger.info(f'Successfully parsed JSON {len(suggestions)} suggestions.')

                            return Response({
                                "midpoint": {
                                    "lat": mid_lat,
                                    "lng": mid_lng,
                                    "address": midpoint_address
                                },
                                "suggestions": suggestions
                            }, status=status.HTTP_200_OK)
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON Decode Error: {str(e)}")

                logger.warning("No valid JSON found in the response. Using default suggestions. views.py ln 209")

                city_name = ''

                for component in reverse_geocode[0].get('address_components', []):
                    if 'locality' in component.get['types', []]:
                        city_name = component.get['long_name', '']
                        break

                if not city_name:
                    for component in reverse_geocode[0].get('address_components', []):
                        if 'administrative_area_level_1' in component.get['types', []]:
                            city_name = component.get('long_name', '')
                            break

                if not city_name:
                    city_name = midpoint_address.split(',')[0]
                        
                
                suggestions = [
                    {
                        "name": f"{city_name} Park",
                        "description": f"A local park in {city_name} with walking trails and picnic areas.",
                        "type": "park"
                    },
                    {
                        "name": f"{city_name} Cafe",
                        "description": "A cozy cafe serving coffee, pastries and light meals.",
                        "type": "cafe"
                    },
                    {
                        "name": f"{city_name} Mall",
                        "description": f"Shopping center with various retail stores in {city_name}.",
                        "type": "shopping"
                    },
                    {
                        "name": "Local Diner",
                        "description": "Classic American diner serving breakfast and lunch.",
                        "type": "restaurant"
                    },
                    {
                        "name": f"{city_name} Museum",
                        "description": f"Museum showcasing the history and culture of {city_name}.",
                        "type": "museum"
                    },
                    {
                        "name": "Movie Theater",
                        "description": "Cinema showing the latest releases.",
                        "type": "entertainment"
                    },
                    {
                        "name": "Public Library",
                        "description": "Community library with books and quiet study spaces.",
                        "type": "education"
                    },
                    {
                        "name": f"{city_name} Golf Course",
                        "description": "18-hole golf course with clubhouse and restaurant.",
                        "type": "sports"
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
                    },
                    {
                        "name": "Local Restaurant",
                        "description": "Find a nearby restaurant to enjoy a meal.",
                        "type": "restaurant"
                    },
                    {
                        "name": "Coffee Break",
                        "description": "Take a coffee break at a local cafe.",
                        "type": "cafe"
                    },
                    {
                        "name": "Parks and Recreation",
                        "description": "Visit a nearby park or recreation area.",
                        "type": "outdoor"
                    },
                    {
                        "name": "Shopping",
                        "description": "Check out local shops and boutiques.",
                        "type": "shopping"
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