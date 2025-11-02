import React, {useState, useEffect} from 'react';
import axios from 'axios';


const API_URL = 'http://127.0.0.1:5001/api';

function EntityList() {

    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEntities = async () => {
        try {
            const response = await axios.get(`${API_URL}/entities`);
            setEntities(response.data);
        }
        catch (err){
            console.error("Error:", err);
            setError("failed loading entities");
        }finally{
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEntities();
    }, []);

    if(loading){
        return <h1>Loading</h1>
    }

    if(error){
        return <>{error}</>;
    }

  return (
    <div>
        <h2>Entity Management</h2>
        <ul>{entities.length===0?(
            <li>
                No entities found
                </li>
                )
                :
                (
                    entities.map((entity) => (
                        <li key = {entity.id}>
                            {entity.name} - {entity.city} - {entity.state}
                        </li>
                    ))
                )
                }
        </ul>
    </div>
  );
}

export default EntityList;