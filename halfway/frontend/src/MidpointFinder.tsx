import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';

interface Suggestion {
    name: string;
    description: string;
    type: string;
}

interface MidpointResponse {
    midpoint: {
        lat: number;
        lng: number;
        address: string;
    }
    status: string;
    suggestions: Suggestion[];
}


const MidpointFinder: React.FC = () => {
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [midpoint, setMidpoint] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post<MidpointResponse>('/api/midpoint/', {
                address1,
                address2
            });
            setMidpoint(res.data.midpoint);
            setSuggestions(res.data.suggestions);
        } catch (error) {
            console.error('Error finding midpoint:', error);
        } finally {
            setLoading(false);
        }
    };


    const mapContainerStyle = {
        width: '100%',
        height: '400px'
    };

    // const center = midpoint ? { lat: midpoint.lat, lng: midpoint.lng } : { lat: 0, lng: 0 };

    return (
        <div className='midpoint-finder'>
            <h1>Midpoint Finder</h1>
            <p>Find the perfect place to meet</p>

            <form onSubmit={handleSubmit}>
                <div className='form-group'>
                    <label htmlFor='address1'>Address 1:</label>
                    <input
                        type='text'
                        id='address1'
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                        required
                        placeholder='Enter first address'
                    />
                </div>
                <div className='form-group'>
                    <label htmlFor='address2'>Address 2:</label>
                    <input
                        type='text'
                        id='address2'
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                        required
                        placeholder='Enter second address'
                    />
                </div>
                <button type='submit' disabled={loading}>
                    {loading ? 'Finding Midpoint...' : 'Find Midpoint'}
                </button>
            </form>

            {midpoint && (
                <div className='results'>
                    <h2>Meet in the Middle</h2>
                    <p className='midpoint-address'>
                        <strong>Suggested meeting location: </strong>
                        {midpoint.address}
                    </p>

                    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={{ lat: midpoint.lat, lng: midpoint.lng }}
                            zoom={13}
                        >
                            <Marker position={{ lat: midpoint.lat, lng: midpoint.lng }} />
                        </GoogleMap>
                    </LoadScript> 

                    <h3>Things to do in the area:</h3>
                    <div className='suggestions'>
                        {suggestions.map((suggestion, index) => (
                            <div key={index} className='suggestion-card'>
                                <h4>{suggestion.name}</h4>
                                <p>{suggestion.description}</p>
                                <span className='tag'>{suggestion.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};



export default MidpointFinder;