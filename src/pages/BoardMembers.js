'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -15, scale: 0.95, transition: { duration: 0.2 } },
};

// Define the default image URL
const DEFAULT_IMAGE_URL =
  'https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png';

// Define the desired order of positions
const POSITION_ORDER = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Social Media',
  'Head of Committee',
  'Events Coordinator',
  'Committee Member',
];

function BoardMembers() {
  const [membersData, setMembersData] = useState([]);
  const [allPositions, setAllPositions] = useState(['All']);
  const [dropdownPositions, setDropdownPositions] = useState([]);

  const [selectedPosition, setSelectedPosition] = useState('President');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/boadMembers');
        if (!response.ok) {
          let errorMsg = `Error: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
              errorMsg = errorData.error;
            }
          } catch (jsonError) {
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setMembersData(data);

        const uniqueDataPositions = [
          ...new Set(data.map((member) => member.position)),
        ];

        const sortedActualPositions = POSITION_ORDER.filter((p) =>
          uniqueDataPositions.includes(p),
        );
        uniqueDataPositions.forEach((p) => {
          if (!sortedActualPositions.includes(p)) {
            sortedActualPositions.push(p);
          }
        });

        setAllPositions(['All', ...sortedActualPositions]);
        setDropdownPositions(sortedActualPositions);
        if (sortedActualPositions.length > 0) {
          if (
            selectedPosition !== 'President' ||
            !sortedActualPositions.includes('President')
          ) {
            setSelectedPosition(sortedActualPositions[0]);
          }
        } else {
          setSelectedPosition('All');
        }
      } catch (e) {
        console.error('Failed to fetch members from API:', e);
        setError(
          e.message || 'Failed to load member data. Please try again later.',
        );
        setSelectedPosition((prev) => (prev === 'President' ? prev : 'All'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); 

  const filteredMembers = useMemo(() => {
    if (selectedPosition === 'All') {
      return membersData;
    }
    return membersData.filter(
      (member) => member.position === selectedPosition,
    );
  }, [membersData, selectedPosition]);

  const handleSelectPosition = (position) => {
    setSelectedPosition(position);
  };

  const handleImageError = (event) => {
    if (event.target.src !== DEFAULT_IMAGE_URL) {
      console.warn(
        `Image failed to load: ${event.target.currentSrc}. Using default.`,
      );
      event.target.src = DEFAULT_IMAGE_URL;
    }
  };

  return (
    <section className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="font-Header text-center mb-8 md:mb-12 text-mainColor md:text-9xl text-7xl sm:text-6xl font-bold">
        Our Team
      </h1>

      {loading && (
        <p className="text-center text-gray-500 py-10">Loading members...</p>
      )}
      {error && (
        <div className="text-center text-red-600 bg-red-100 border border-red-400 rounded p-4 my-4 max-w-md mx-auto">
          <p className="font-semibold">Error Loading Data</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && membersData.length > 0 && (
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="block md:hidden mb-6">
            <label
              htmlFor="position-select"
              className="block text-4xl font-medium text-center font-Header text-mainColor mb-1"
            >
              Filter by Position:
            </label>
            <select
              id="position-select"
              value={selectedPosition === 'All' ? '' : selectedPosition}
              onChange={(e) => handleSelectPosition(e.target.value)}
              className="w-full mb-3 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all focus:ring-1"
              disabled={dropdownPositions.length === 0}
            >
              {dropdownPositions.length === 0 && (
                <option value="" disabled>
                  No positions available
                </option>
              )}
              {dropdownPositions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
          <aside className="hidden md:block w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
            <nav className="p-4 md:p-6 bg-white rounded-lg shadow-md sticky top-4">
              <h2 className="text-2xl lg:text-3xl font-Header text-mainColor mb-5 border-b border-gray-300 pb-3">
                Filter by Position
              </h2>
              <ul className="space-y-3">
                {allPositions.map((position) => (
                  <li key={position}>
                    <button
                      onClick={() => handleSelectPosition(position)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 ease-in-out text-base lg:text-lg ${
                        selectedPosition === position
                          ? 'bg-mainColor text-white font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-mainColor'
                      }`}
                    >
                      {position}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <main className="w-full md:w-3/4 lg:w-4/5 min-h-[500px] max-h-[650px] overflow-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPosition} 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <motion.div
                      key={member.id}
                      variants={cardVariants}
                      layout
                      className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col transform transition-transform duration-300 hover:scale-[1.03]"
                    >
                      <img
                        src={member.imageUrl || DEFAULT_IMAGE_URL}
                        alt={member.name || 'Association Member'}
                        className="w-full h-80 object-cover"
                        loading="lazy"
                        onError={handleImageError}
                      />
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">
                          {member.name}
                        </h3>
                        <p className="text-sm font-medium text-mainColor mb-3">
                          {member.position}
                        </p>
                        {member.contact && (
                          <p className="text-sm font-medium text-mainColor mb-3 break-words">
                            {member.contact}
                          </p>
                        )}
                        <p className="text-gray-600 text-sm flex-grow">
                          {member.bio}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="col-span-full text-center text-gray-500 py-16"
                  >
                    No members found for the "{selectedPosition}" position.
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
      {!loading && !error && membersData.length === 0 && (
        <p className="text-center text-gray-500 py-10">
          No team members found.
        </p>
      )}
    </section>
  );
}

export default BoardMembers;
