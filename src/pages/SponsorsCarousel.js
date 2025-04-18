'use client';

import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const DEFAULT_SPONSOR_LOGO =
  'https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png';

function SponsorsCarousel() {
  const [sponsorsData, setSponsorsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sponsors');
        if (!response.ok) {
          let errorMsg = `Error: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
              errorMsg = errorData.error;
            }
          } catch (jsonError) {}
          throw new Error(errorMsg);
        }
        const data = await response.json();
        setSponsorsData(data);
      } catch (e) {
        console.error('Failed to fetch sponsors from API:', e);
        setError(
          e.message || 'Failed to load sponsor data. Please try again later.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleImageError = (event) => {
    if (event.target.src !== DEFAULT_SPONSOR_LOGO) {
      console.warn(
        `Sponsor logo failed to load: ${event.target.currentSrc}. Using default.`,
      );
      event.target.src = DEFAULT_SPONSOR_LOGO;
    }
  };

  const settings = {
    dots: false,
    infinite: true,
    speed: 5000,
    autoplay: true, 
    autoplaySpeed: 0, 
    cssEase: 'linear', 
    slidesToShow: 5, 
    slidesToScroll: 1,
    pauseOnHover: true, 
    arrows: false, 
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 5,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  const canRenderSlider = !loading && !error && sponsorsData.length > 0;
  const hasEnoughSponsors = sponsorsData.length >= settings.slidesToShow;

  return (
    <section className="py-12 md:py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-7xl font-bold text-center text-mainColor font-Header mb-10 md:mb-12">
          Sponsors
        </h2>

        {loading && (
          <p className="text-center text-gray-500">Loading sponsors...</p>
        )}
        {error && (
          <div className="text-center text-red-600 bg-red-100 border border-red-400 rounded p-4 my-4 max-w-md mx-auto">
            <p className="font-semibold">Error Loading Sponsors</p>
            <p>{error}</p>
          </div>
        )}

        {canRenderSlider && (
          <Slider {...settings} className={!hasEnoughSponsors ? 'opacity-50 pointer-events-none' : ''}>
            {sponsorsData.map((sponsor) => (
              <div key={sponsor.id} className="px-4">
                <a
                  href={sponsor.websiteUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block outline-none focus:ring-2 focus:ring-indigo-300 rounded"
                  aria-label={`Visit ${sponsor.name}`}
                  onClick={(e) => !sponsor.websiteUrl && e.preventDefault()}
                  style={{ cursor: sponsor.websiteUrl ? 'pointer' : 'default' }}
                >
                  <img
                    src={sponsor.imageUrl || DEFAULT_SPONSOR_LOGO}
                    alt={sponsor.name}
                    className="h-64 w-auto mx-auto object-contain grayscale transition duration-300 hover:grayscale-0" 
                    loading="lazy"
                    onError={handleImageError}
                  />
                </a>
              </div>
            ))}
          </Slider>
        )}

        {/* Optional: Message if not enough sponsors for carousel */}
        {!loading && !error && sponsorsData.length > 0 && !hasEnoughSponsors && (
           <p className="text-center text-gray-500 mt-4">More sponsors coming soon!</p>
        )}

        {/* Message if no sponsors loaded at all */}
         {!loading && !error && sponsorsData.length === 0 && (
           <p className="text-center text-gray-500 py-10">We are currently seeking sponsors.</p>
        )}

      </div>
    </section>
  );
}

export default SponsorsCarousel;
