import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import axios from 'axios';
import AddressAutocomplete from './AddressAutocomplete';

// Using simple input for direct comparison
const SimpleInput: React.FC<{
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}> = ({ label, id, value, onChange, placeholder, required }) => (
  <div>
    <label 
      htmlFor={id}
      style={{ display: 'block', marginBottom: '5px' }}
    >
      {label}
    </label>
    <input
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{ 
        width: '100%', 
        padding: '8px', 
        borderRadius: '4px', 
        border: '1px solid #ccc' 
      }}
    />
  </div>
);

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
    };
    suggestions: Suggestion[];
}

const MidpointFinder: React.FC = () => {
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [radius, setRadius] = useState(5);
    const [midpoint, setMidpoint] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // For debugging: track if Google Maps is loaded
    const [isGoogleLoaded, setIsGoogleLoaded] = useState<boolean>(
      !!(window.google && window.google.maps && window.google.maps.places)
    );

    // For testing: Show which type of input we're using
    const [useAutocomplete, setUseAutocomplete] = useState<boolean>(true);

    const mapContainerStyle = {
        width: '100%',
        height: '400px'
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log("Sending request:", { address1, address2, radius });
            
            // Use relative URL with proxy from package.json
            const res = await axios.post<MidpointResponse>('/api/midpoint/', {
                address1,
                address2,
                radius // Include radius in the request
            }, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log("API Response:", res.data);
            
            if (res.data && res.data.midpoint) {
                setMidpoint(res.data.midpoint);
                setSuggestions(res.data.suggestions || []);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error: any) {
            console.error('Error finding midpoint:', error);
            
            // Extract error message if available
            let errorMsg = 'Failed to find midpoint. Please try different addresses or try again later.';
            if (error.response && error.response.data && error.response.data.error) {
                errorMsg = error.response.data.error;
            }
            
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };
    
    // Check for Google Maps loading
    React.useEffect(() => {
      const checkGoogleMapsLoaded = () => {
        const isLoaded = !!(window.google && window.google.maps && window.google.maps.places);
        setIsGoogleLoaded(isLoaded);
        console.log("Google Maps loaded:", isLoaded);
        
        if (!isLoaded) {
          // Check again in 1 second
          setTimeout(checkGoogleMapsLoaded, 1000);
        }
      };
      
      checkGoogleMapsLoaded();
    }, []);

    return (
        <div className='midpoint-finder' style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h1 style={{ textAlign: 'center' }}>Halfway</h1>
            <p style={{ textAlign: 'center' }}>Find the perfect place to meet your friends in the middle</p>
            
            {/* Debug information
            <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <p><strong>Debug Info:</strong></p>
                <p>Google Maps API loaded: {isGoogleLoaded ? '✅ Yes' : '❌ No'}</p>
                <button 
                  onClick={() => setUseAutocomplete(!useAutocomplete)}
                  style={{ padding: '5px 10px', marginBottom: '10px' }}
                >
                  Switch to {useAutocomplete ? 'Regular Input' : 'Autocomplete'}
                </button>
                <p>Currently using: <strong>{useAutocomplete ? 'Autocomplete Input' : 'Regular Input'}</strong></p>
            </div> */}

            <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
                <div className='form-group' style={{ marginBottom: '15px' }}>
                    {useAutocomplete ? (
                      <AddressAutocomplete
                          label="Address 1:"
                          id="address1"
                          value={address1}
                          onChange={setAddress1}
                          placeholder="Enter first address"
                          required
                      />
                    ) : (
                      <SimpleInput
                          label="Address 1:"
                          id="address1"
                          value={address1}
                          onChange={setAddress1}
                          placeholder="Enter first address"
                          required
                      />
                    )}
                </div>
                <div className='form-group' style={{ marginBottom: '15px' }}>
                    {useAutocomplete ? (
                      <AddressAutocomplete
                          label="Address 2:"
                          id="address2"
                          value={address2}
                          onChange={setAddress2}
                          placeholder="Enter second address"
                          required
                      />
                    ) : (
                      <SimpleInput
                          label="Address 2:"
                          id="address2"
                          value={address2}
                          onChange={setAddress2}
                          placeholder="Enter second address"
                          required
                      />
                    )}
                </div>
                <div className='form-group' style={{ marginBottom: '15px' }}>
                    <label htmlFor='radius' style={{ display: 'block', marginBottom: '5px' }}>
                        Search Radius: {radius} miles
                    </label>
                    <input
                        type='range'
                        id='radius'
                        min='1'
                        max='20'
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>1 mile</span>
                        <span>20 miles</span>
                    </div>
                </div>
                <button 
                    type='submit' 
                    disabled={loading}
                    style={{ 
                        width: '100%', 
                        padding: '10px', 
                        backgroundColor: '#4285F4', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Finding Midpoint...' : 'Find Midpoint'}
                </button>
            </form>

            {error && (
                <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {midpoint && (
                <div className='results'>
                    <h2 style={{ textAlign: 'center' }}>Meet in the Middle</h2>
                    <p className='midpoint-address' style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <strong>Suggested meeting location: </strong>
                        {midpoint.address}
                    </p>

                    <div style={{ marginBottom: '30px' }}>
                        {midpoint && (
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={{ lat: midpoint.lat, lng: midpoint.lng }}
                                zoom={12}
                            >
                                <Marker 
                                    position={{ lat: midpoint.lat, lng: midpoint.lng }} 
                                />
                                <Circle
                                    center={{ lat: midpoint.lat, lng: midpoint.lng }}
                                    radius={radius * 1609.34} // Convert miles to meters
                                    options={{
                                        fillColor: '#4285F4',
                                        fillOpacity: 0.1,
                                        strokeColor: '#4285F4',
                                        strokeOpacity: 0.8,
                                        strokeWeight: 2,
                                    }}
                                />
                            </GoogleMap>
                        )}
                    </div>

                    <h3 style={{ textAlign: 'center' }}>
                        Things to do within {radius} miles
                    </h3>
                    {suggestions.length === 0 ? (
                        <p style={{ textAlign: 'center' }}>No suggestions available for this location.</p>
                    ) : (
                        <>
                            <div className='suggestions-filter' style={{ marginBottom: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                                    Showing {suggestions.length} recommendations near {midpoint.address}
                                </p>
                            </div>
                            <div className='suggestions' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                {suggestions.map((suggestion, index) => (
                                    <div 
                                        key={index} 
                                        className='suggestion-card'
                                        style={{ 
                                            padding: '15px', 
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                            backgroundColor: '#f8f9fa',
                                        }}
                                    >
                                        <h4 style={{ marginTop: 0, marginBottom: '8px' }}>{suggestion.name}</h4>
                                        <p style={{ fontSize: '14px', margin: '0 0 10px 0' }}>{suggestion.description}</p>
                                        <span 
                                            className='tag'
                                            style={{ 
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                backgroundColor: '#4285F4',
                                                color: 'white',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {suggestion.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MidpointFinder;




























// import { GoogleMap, LoadScript, Marker, useLoadScript } from '@react-google-maps/api';
// import axios from 'axios';
// import Autocomplete from './AutoComplete';

// // Define libraries for Google Maps
// const libraries: ['places'] = ["places"];

// interface Suggestion {
//     name: string;
//     description: string;
//     type: string;
// }

// interface MidpointResponse {
//     midpoint: {
//         lat: number;
//         lng: number;
//         address: string;
//     };
//     suggestions: Suggestion[];
// }

// const MidpointFinder: React.FC = () => {
//     const [address1, setAddress1] = useState('');
//     const [address2, setAddress2] = useState('');
//     const [midpoint, setMidpoint] = useState<{ lat: number; lng: number; address: string } | null>(null);
//     const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     const mapContainerStyle = {
//         width: '100%',
//         height: '400px'
//     };

//     const { isLoaded } = useLoadScript({
//         googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
//         libraries,
//     });

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);
//         setError(null);

//         try {
//             console.log("Sending addresses:", { address1, address2 });
            
//             const res = await axios.post<MidpointResponse>('/api/midpoint/', {
//                 address1,
//                 address2
//             });
            
//             console.log("API Response:", res.data);
            
//             setMidpoint(res.data.midpoint);
//             setSuggestions(res.data.suggestions);
//         } catch (error: any) {
//             console.error('Error finding midpoint:', error);
            
//             // Extract error message if available
//             let errorMsg = 'Failed to find midpoint. Please try different addresses or try again later.';
//             if (error.response && error.response.data && error.response.data.error) {
//                 errorMsg = error.response.data.error;
//             }
            
//             setError(errorMsg);
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (!isLoaded) {
//         return <div>Loading Google Maps...</div>;
//     }

//     return (
//         <div className='midpoint-finder' style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
//             <h1 style={{ textAlign: 'center' }}>Halfway</h1>
//             <p style={{ textAlign: 'center' }}>Find the perfect place to meet your friends in the middle</p>

//             <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
//                 <div className='form-group' style={{ marginBottom: '15px' }}>
//                     <Autocomplete
//                         label="Address 1:"
//                         id="address1"
//                         value={address1}
//                         onChange={setAddress1}
//                         required
//                         placeholder="Enter first address"
//                     />
//                 </div>
//                 <div className='form-group' style={{ marginBottom: '15px' }}>
//                     <Autocomplete
//                         label="Address 2:"
//                         id="address2"
//                         value={address2}
//                         onChange={setAddress2}
//                         required
//                         placeholder="Enter second address"
//                     />
//                 </div>
//                 <button 
//                     type='submit' 
//                     disabled={loading}
//                     style={{ 
//                         width: '100%', 
//                         padding: '10px', 
//                         backgroundColor: '#4285F4', 
//                         color: 'white', 
//                         border: 'none', 
//                         borderRadius: '4px',
//                         cursor: loading ? 'not-allowed' : 'pointer'
//                     }}
//                 >
//                     {loading ? 'Finding Midpoint...' : 'Find Midpoint'}
//                 </button>
//             </form>

//             {error && (
//                 <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
//                     {error}
//                 </div>
//             )}

//             {midpoint && (
//                 <div className='results'>
//                     <h2 style={{ textAlign: 'center' }}>Meet in the Middle</h2>
//                     <p className='midpoint-address' style={{ textAlign: 'center', marginBottom: '20px' }}>
//                         <strong>Suggested meeting location: </strong>
//                         {midpoint.address}
//                     </p>

//                     <div style={{ marginBottom: '30px' }}>
//                         <GoogleMap
//                             mapContainerStyle={mapContainerStyle}
//                             center={{ lat: midpoint.lat, lng: midpoint.lng }}
//                             zoom={13}
//                         >
//                             <Marker position={{ lat: midpoint.lat, lng: midpoint.lng }} />
//                         </GoogleMap>
//                     </div>

//                     <h3 style={{ textAlign: 'center' }}>Things to do in the area:</h3>
//                     <div className='suggestions' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
//                         {suggestions.map((suggestion, index) => (
//                             <div 
//                                 key={index} 
//                                 className='suggestion-card'
//                                 style={{ 
//                                     padding: '15px', 
//                                     borderRadius: '8px',
//                                     boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
//                                     backgroundColor: '#f8f9fa'
//                                 }}
//                             >
//                                 <h4 style={{ marginTop: 0 }}>{suggestion.name}</h4>
//                                 <p>{suggestion.description}</p>
//                                 <span 
//                                     className='tag'
//                                     style={{ 
//                                         display: 'inline-block',
//                                         padding: '4px 8px',
//                                         backgroundColor: '#4285F4',
//                                         color: 'white',
//                                         borderRadius: '4px',
//                                         fontSize: '12px'
//                                     }}
//                                 >
//                                     {suggestion.type}
//                                 </span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default MidpointFinder;




























// import React, { useState } from 'react';
// import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
// import axios from 'axios';

// interface Suggestion {
//     name: string;
//     description: string;
//     type: string;
// }

// interface MidpointResponse {
//     midpoint: {
//         lat: number;
//         lng: number;
//         address: string;
//     }
//     // status: string;
//     suggestions: Suggestion[];
// }


// const MidpointFinder: React.FC = () => {
//     const [address1, setAddress1] = useState('');
//     const [address2, setAddress2] = useState('');
//     const [midpoint, setMidpoint] = useState<{ lat: number; lng: number; address: string } | null>(null);
//     const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null)

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);
//         setError(null);

//         try {
//             const res = await axios.post<MidpointResponse>('/api/midpoint/', {
//                 address1,
//                 address2
//             });
//             setMidpoint(res.data.midpoint);
//             setSuggestions(res.data.suggestions);
//         } catch (error) {
//             console.error('Error finding midpoint:', error);
//         } finally {
//             setLoading(false);
//         }
//     };


//     const mapContainerStyle = {
//         width: '100%',
//         height: '400px'
//     };

//     // const center = midpoint ? { lat: midpoint.lat, lng: midpoint.lng } : { lat: 0, lng: 0 };

//     return (
//         <div className='midpoint-finder' style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
//             <h1 style={{ textAlign: 'center' }}>Halfway</h1>
//             <p style={{ textAlign: 'center' }}>Find the perfect place to meet your friends in the middle</p>

//             <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
//                 <div className='form-group' style={{ marginBottom: '15px' }}>
//                     <label htmlFor='address1' style={{ display: 'block', marginBottom: '5px' }}>Address 1:</label>
//                     <input
//                         type='text'
//                         id='address1'
//                         value={address1}
//                         onChange={(e) => setAddress1(e.target.value)}
//                         required
//                         placeholder='Enter first address'
//                         style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
//                     />
//                 </div>
//                 <div className='form-group' style={{ marginBottom: '15px' }}>
//                     <label htmlFor='address2' style={{ display: 'block', marginBottom: '5px' }}>Address 2:</label>
//                     <input
//                         type='text'
//                         id='address2'
//                         value={address2}
//                         onChange={(e) => setAddress2(e.target.value)}
//                         required
//                         placeholder='Enter second address'
//                         style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
//                     />
//                 </div>
//                 <button 
//                     type='submit' 
//                     disabled={loading}
//                     style={{ 
//                         width: '100%', 
//                         padding: '10px', 
//                         backgroundColor: '#4285F4', 
//                         color: 'white', 
//                         border: 'none', 
//                         borderRadius: '4px',
//                         cursor: loading ? 'not-allowed' : 'pointer'
//                     }}
//                 >
//                     {loading ? 'Finding Midpoint...' : 'Find Midpoint'}
//                 </button>
//             </form>

//             {error && (
//                 <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
//                     {error}
//                 </div>
//             )}

//             {midpoint && (
//                 <div className='results'>
//                     <h2 style={{ textAlign: 'center' }}>Meet in the Middle</h2>
//                     <p className='midpoint-address' style={{ textAlign: 'center', marginBottom: '20px' }}>
//                         <strong>Suggested meeting location: </strong>
//                         {midpoint.address}
//                     </p>

//                     <div style={{ marginBottom: '30px' }}>
//                         <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
//                             <GoogleMap
//                                 mapContainerStyle={mapContainerStyle}
//                                 center={{ lat: midpoint.lat, lng: midpoint.lng }}
//                                 zoom={13}
//                             >
//                                 <Marker position={{ lat: midpoint.lat, lng: midpoint.lng }} />
//                             </GoogleMap>
//                         </LoadScript>
//                     </div>

//                     <h3 style={{ textAlign: 'center' }}>Things to do in the area:</h3>
//                     <div className='suggestions' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
//                         {suggestions.map((suggestion, index) => (
//                             <div 
//                                 key={index} 
//                                 className='suggestion-card'
//                                 style={{ 
//                                     padding: '15px', 
//                                     borderRadius: '8px',
//                                     boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
//                                     backgroundColor: '#f8f9fa'
//                                 }}
//                             >
//                                 <h4 style={{ marginTop: 0 }}>{suggestion.name}</h4>
//                                 <p>{suggestion.description}</p>
//                                 <span 
//                                     className='tag'
//                                     style={{ 
//                                         display: 'inline-block',
//                                         padding: '4px 8px',
//                                         backgroundColor: '#4285F4',
//                                         color: 'white',
//                                         borderRadius: '4px',
//                                         fontSize: '12px'
//                                     }}
//                                 >
//                                     {suggestion.type}
//                                 </span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default MidpointFinder;