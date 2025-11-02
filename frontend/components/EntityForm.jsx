import React, { useState } from 'react';

function EntityForm() {
  
  const [name, setName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  const handleSubmit = (e) => {
    
    e.preventDefault();
    
        console.log('Form submitted with:', { name, streetAddress, city, state, zipCode });

    setName('');
    setStreetAddress('');
    setCity('');
    setState('');
    setZipCode('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Entity</h3>
      <div>
        <label>Name:</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
        />
      </div>
      <div>
        <label>Street Address:</label>
        <input 
          type="text" 
          value={streetAddress} 
          onChange={(e) => setStreetAddress(e.target.value)} 
        />
      </div>
      <div>
        <label>City:</label>
        <input 
          type="text" 
          value={city} 
          onChange={(e) => setCity(e.target.value)} 
        />
      </div>
      <div>
        <label>State:</label>
        <input 
          type="text" 
          value={state} 
          onChange={(e) => setState(e.target.value)} 
        />
      </div>
      <div>
        <label>Zip Code:</label>
        <input 
          type="text" 
          value={zipCode} 
          onChange={(e) => setZipCode(e.target.value)} 
        />
      </div>
      <button type="submit">Add Entity</button>
    </form>
  );
}

export default EntityForm;