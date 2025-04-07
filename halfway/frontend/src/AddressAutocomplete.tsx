import React, { useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  label,
  id,
  value,
  onChange,
  placeholder = 'Enter an address',
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initAutocomplete = () => {
      // Check if Google Maps is available
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn('Google Maps Places API not loaded');
        return;
      }

      // Get the input element
      const input = inputRef.current;
      if (!input) return;

      // Create the autocomplete instance
      const autocomplete = new window.google.maps.places.Autocomplete(input);
      
      // Set fields to retrieve (optional)
      autocomplete.setFields(['address_components', 'formatted_address', 'geometry', 'name']);
      
      // Add listener for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
          console.log('Selected place:', place.formatted_address);
        }
      });
    };

    // Initialize autocomplete when the component mounts
    initAutocomplete();

    // Cleanup function
    return () => {
      // No need to clean up Google Maps objects as they are automatically 
      // removed when the DOM element is destroyed
    };
  }, [onChange]); // Only re-run if onChange changes

  return (
    <div>
      <label 
        htmlFor={id}
        style={{ display: 'block', marginBottom: '5px' }}
      >
        {label}
      </label>
      <input
        ref={inputRef}
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
};

export default AddressAutocomplete;



























// import React, { useEffect, useState } from 'react';
// import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

// interface AddressAutocompleteProps {
//   label: string;
//   id: string;
//   value: string;
//   onChange: (value: string) => void;
//   placeholder?: string;
//   required?: boolean;
// }

// const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
//   label,
//   id,
//   value,
//   onChange,
//   placeholder = 'Enter an address',
//   required = false,
// }) => {
//   const {
//     ready,
//     value: inputValue,
//     suggestions: { status, data },
//     setValue,
//     clearSuggestions,
//   } = usePlacesAutocomplete({
//     requestOptions: {
//       /* Define search scope here - e.g. country restrictions */
//       componentRestrictions: { country: 'us' }, // Limit to US addresses - modify as needed
//     },
//     debounce: 300,
//   });
  
//   const [showSuggestions, setShowSuggestions] = useState(false);

//   // Sync external value with internal input state
//   useEffect(() => {
//     setValue(value, false);
//   }, [value, setValue]);

//   const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setValue(e.target.value);
//     onChange(e.target.value);
//     setShowSuggestions(true);
//   };

//   const handleSelect = (suggestion: google.maps.places.AutocompletePrediction) => () => {
//     // Update the value of the input
//     setValue(suggestion.description, false);
//     onChange(suggestion.description);
//     setShowSuggestions(false);
//     clearSuggestions();
//   };

//   return (
//     <div className='address-autocomplete' style={{ position: 'relative' }}>
//       <label 
//         htmlFor={id}
//         style={{ display: 'block', marginBottom: '5px' }}
//       >
//         {label}
//       </label>
//       <input
//         type='text'
//         id={id}
//         value={inputValue}
//         onChange={handleInput}
//         disabled={!ready}
//         required={required}
//         placeholder={placeholder}
//         style={{ 
//           width: '100%', 
//           padding: '8px', 
//           borderRadius: '4px', 
//           border: '1px solid #ccc',
//         }}
//         onFocus={() => setShowSuggestions(true)}
//         onBlur={() => {
//           // Delay hiding suggestions to allow for selection
//           setTimeout(() => setShowSuggestions(false), 200);
//         }}
//       />

//       {/* Suggestions dropdown */}
//       {status === 'OK' && showSuggestions && (
//         <ul 
//           style={{ 
//             position: 'absolute', 
//             zIndex: 1000, 
//             width: '100%', 
//             backgroundColor: 'white', 
//             borderRadius: '4px', 
//             boxShadow: '0 2px 6px rgba(0,0,0,0.3)', 
//             marginTop: '2px', 
//             padding: '8px 0', 
//             maxHeight: '200px', 
//             overflowY: 'auto',
//             listStyle: 'none',
//           }}
//         >
//           {data.map((suggestion) => (
//             <li 
//               key={suggestion.place_id}
//               onClick={handleSelect(suggestion)}
//               style={{ 
//                 padding: '8px 16px', 
//                 cursor: 'pointer',
//                 fontSize: '14px',
//               }}
//               onMouseDown={(e) => e.preventDefault()} // Prevent blur
//               onMouseOver={(e) => {
//                 e.currentTarget.style.backgroundColor = '#f1f3f4';
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.backgroundColor = 'transparent';
//               }}
//             >
//               {suggestion.description}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default AddressAutocomplete;