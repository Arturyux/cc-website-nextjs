"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from "@tanstack/react-query";
import Link from 'next/link';

import GenericActivityModal from '../components/ActivitiesModal/GenericActivityModal';
import ActivitiesMobile from './mobile/ActivitiesMobile';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
  exit: { opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.2, ease: 'easeOut' } },
};
const CARD_HEIGHT_DESKTOP = 450;
const CARD_WIDTH_DESKTOP = 'max-w-3xl';
const CARD_PEEK_Y_DESKTOP = -30;
const CARD_PEEK_X_DESKTOP = 18;

const fetchCardsData = async () => {
  const response = await fetch('/api/cards');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch cards: ${response.statusText}`);
  }
  const data = await response.json();
  return data.map((card) => ({
    ...card,
    description: card.description || `Learn more about our exciting ${card.title} activity! More details inside.`,
    inDescription: Array.isArray(card.inDescription)
      ? card.inDescription.map(item => ({
          ...item,
          ImagesUrl: Array.isArray(item.ImagesUrl) ? item.ImagesUrl : []
        }))
      : [],
  }));
};

export default function ActivitiesPage() {
  const [displayCards, setDisplayCards] = useState([]);
  const [lastDirection, setLastDirection] = useState(null);
  const [error, setError] = useState(null);
  const [activeModalCard, setActiveModalCard] = useState(null);

  const {
    data: cardsData = [],
    isLoading: isLoadingCards,
    isError: isCardsError,
    error: cardsFetchError,
    isSuccess: isCardsSuccess,
  } = useQuery({
    queryKey: ['activityCards'],
    queryFn: fetchCardsData,
  });

  useEffect(() => {
    if (isCardsSuccess && cardsData) {
      setDisplayCards(cardsData);
      setError(null);
    } else if (isCardsError) {
      setError(cardsFetchError?.message || 'Failed to load card data.');
    }
  }, [isCardsSuccess, cardsData, isCardsError, cardsFetchError]);

  const rotateLeft = () => {
    if (displayCards.length < 2) return;
    setLastDirection('left');
    setDisplayCards((prevCards) => {
      const lastCard = prevCards[prevCards.length - 1];
      return [lastCard, ...prevCards.slice(0, prevCards.length - 1)];
    });
  };

  const rotateRight = () => {
    if (displayCards.length < 2) return;
    setLastDirection('right');
    setDisplayCards((prevCards) => {
      const [firstCard, ...rest] = prevCards;
      return [...rest, firstCard];
    });
  };

  const openModal = (cardIdOrTitle) => {
    const cardToShow = displayCards.find(card => card.id === cardIdOrTitle || card.title === cardIdOrTitle);
    if (cardToShow) {
      setActiveModalCard(cardToShow);
    } else {
      console.warn("Could not find card data for modal:", cardIdOrTitle);
    }
  };

  const closeModal = () => {
    setActiveModalCard(null);
  };

  const cardVariants = {
    stack: (index) => ({
      opacity: index < 4 ? 1 - index * 0.15 : 0,
      scale: 1 - index * 0.04,
      x: index * CARD_PEEK_X_DESKTOP,
      y: index * CARD_PEEK_Y_DESKTOP,
      zIndex: displayCards.length - index,
      transition: { type: 'spring', stiffness: 100, damping: 20 },
    }),
    center: { x: 0, y: 0, opacity: 1, scale: 1, zIndex: displayCards.length + 1, transition: { type: 'spring', stiffness: 100, damping: 20 } },
    exit: (direction) => ({ x: direction === 'right' ? -600 : 600, opacity: 0, scale: 0.9, y: 30, zIndex: 0, transition: { duration: 0.4, ease: 'easeInOut' } }),
  };
  const stackContainerHeight = CARD_HEIGHT_DESKTOP + Math.abs(CARD_PEEK_Y_DESKTOP * 3) + 50;

  if (isLoadingCards && displayCards.length === 0) {
    return <div className="text-center py-10">Loading activities...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen py-8 md:py-12 overflow-x-hidden">
      <p className="font-Header text-mainColor md:text-9xl text-7xl sm:text-6xl font-bold">Weekly Activities</p>

      <div className="hidden md:flex flex-col items-center w-full max-w-6xl px-4">
        <div className="flex items-center justify-center w-full">
          <div className={`relative w-full ${CARD_WIDTH_DESKTOP} mx-auto`} style={{ height: `${stackContainerHeight}px` }}>
            <AnimatePresence initial={false} custom={lastDirection}>
              {displayCards.map((card, index) => {
                 const imageSrc = card.imageUrl;
                 return (
                   <motion.div
                     key={card.id}
                     className="absolute w-full cursor-pointer origin-bottom"
                     style={{ height: `${CARD_HEIGHT_DESKTOP}px`, left: '0', right: '0', top: '50px', marginLeft: 'auto', marginRight: 'auto' }}
                     custom={index === 0 ? lastDirection : index}
                     variants={cardVariants}
                     initial="stack"
                     animate={index === 0 ? 'center' : 'stack'}
                     exit="exit"
                     onClick={() => { if (index === 0) rotateRight(); }}
                   >
                     <div className={`card ${card.bgColor || 'bg-gradient-to-br from-gray-100 to-gray-200'} w-full h-full flex rounded-xl border-2 border-black shadow-black shadow-xl overflow-hidden`}>
                       <div className="w-1/2 flex flex-col justify-between p-5 lg:p-6 text-left">
                         <div>
                           <h2 className="card-title text-black text-2xl lg:text-3xl font-bold mb-3">{card.title}</h2>
                           <p className="text-base lg:text-lg text-gray-700 font-medium mb-4 line-clamp-4">{card.description}</p>
                         </div>
                         <div>
                           <div className="text-sm lg:text-base font-semibold mb-4 space-y-1">
                             <p className="text-gray-800"><span className="font-bold">Date:</span> {card.date}</p>
                             <p className="text-gray-800"><span className="font-bold">Time:</span> {card.time}</p>
                             <p className="text-gray-800"><span className="font-bold">Location:</span> {card.location}</p>
                           </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); 
                              openModal(card.id ?? card.title); }} 
                              className="w-[50%] text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor text-black font-semibold" > 
                              More Info 
                            </button>
                         </div>
                       </div>
                       <div className="w-1/2 h-full bg-gray-300 relative">
                         {imageSrc ? ( <motion.img key={imageSrc} src={imageSrc} alt={card.title} className="object-cover w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
                         ) : ( <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400"><span className="text-gray-600 text-4xl font-bold opacity-50">{card.title.substring(0, 3)}</span></div> )}
                       </div>
                     </div>
                   </motion.div>
                 );
              })}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center space-x-5 justify-center w-full">
          <Link href="/events" className="relative px-10 p-4 text-white bg-baseColor rounded-full font-Header text-4xl hover:scale-110"> <p>Events</p> </Link>
          <motion.button onClick={rotateRight} className="relative px-10 p-4 text-white bg-baseColor rounded-full font-Header text-4xl" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={displayCards.length < 2} aria-label="Next Activity"> <p>Next Card</p> </motion.button>
        </div>
      </div>

      <div className="md:hidden flex items-center justify-center px-4 py-4 w-full">
        <ActivitiesMobile
          cards={displayCards}
          rotateLeft={rotateLeft}
          rotateRight={rotateRight}
          openModal={openModal}
          lastDirection={lastDirection}
        />
      </div>

      <AnimatePresence>
        {activeModalCard && (
          <GenericActivityModal
            isOpen={!!activeModalCard}
            onClose={closeModal}
            cardData={activeModalCard}
            motionVariants={modalVariants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
