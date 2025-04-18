import React, { useState, useEffect } from "react";

const Linktree = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); 
      try {
        const response = await fetch('/api/linktree'); 
        if (!response.ok) {
          let errorMsg = `Error: ${response.status} ${response.statusText}`;
          try {
            const errorText = await response.text();
            console.debug("Error response text:", errorText); 
            const errorData = JSON.parse(errorText); 
            if (errorData && errorData.error) {
              errorMsg = errorData.error;
            }
          } catch (parseError) {
             console.warn("Could not parse error response as JSON:", parseError);
          }
          throw new Error(errorMsg);
        }
        const data = await response.json();
        setLinks(data);
      } catch (e) {
        console.error('Failed to fetch linktree from API:', e);
        setError(
          e.message || 'Failed to load linktree data. Please try again later.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); 

  if (loading) {
    return <p className="text-center text-lg">Loading links...</p>;
  }

  if (error) {
    return <p className="text-center text-lg text-red-600">Error: {error}</p>;
  }

  if (links.length === 0) {
    return <p className="text-center text-lg">No links available.</p>;
  }
  return (
    <div className="flex flex-col space-y-4">
      {links.map((item, index) => (
        <a
          key={item.link || index}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <div
            className={`w-full text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 ${
              item.color.startsWith("#") ? "" : item.color 
            }`}
            style={
              item.color.startsWith("#")
                ? { backgroundColor: item.color }
                : {}
            }
          >
            <p className={`text-xl font-bold ${item.textColor ?? 'text-black'}`}>
              {item.text}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default Linktree;
