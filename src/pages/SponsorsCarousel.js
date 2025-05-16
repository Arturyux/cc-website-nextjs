'use client';

import React from 'react';
import Slider from 'react-slick';
import { useQuery } from '@tanstack/react-query';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const DEFAULT_SPONSOR_LOGO =
  'https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png';

const fetchSponsors = async () => {
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
  return data;
};

function SponsorsCarousel() {
  const {
    data: sponsorsData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['sponsors'],
    queryFn: fetchSponsors,
  });

  const handleImageError = (event) => {
    const target = event.target;
    if (target.src !== DEFAULT_SPONSOR_LOGO) {
      console.warn(
        `Sponsor logo failed to load: ${target.currentSrc}. Using default.`,
      );
      target.src = DEFAULT_SPONSOR_LOGO;
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
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 3,
        },
      },
    ],
  };

  const canRenderSlider = !isLoading && !isError && sponsorsData.length > 0;

  return (
    <section className="py-12 md:py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-7xl font-bold text-center mb-5 text-mainColor font-Header">
          Colabarators
        </h2>

        {isLoading && (
          <p className="text-center text-gray-500">Loading sponsors...</p>
        )}

        {isError && (
          <div className="text-center text-red-600 bg-red-100 border border-red-400 rounded p-4 my-4 max-w-md mx-auto">
            <p className="font-semibold">Error Loading Sponsors</p>
            <p>{error?.message || 'An unknown error occurred.'}</p>
          </div>
        )}

        {canRenderSlider && (
          <Slider {...settings}>
            {sponsorsData.map((sponsor) => (
              <div key={sponsor.id} className="px-2 flex justify-center">
                <a
                  href={sponsor.websiteUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block outline-none focus:ring-2 focus:ring-indigo-300 rounded-full"
                  aria-label={`Visit ${sponsor.name}`}
                  onClick={(e) => !sponsor.websiteUrl && e.preventDefault()}
                  style={{ cursor: sponsor.websiteUrl ? 'pointer' : 'default' }}
                >
                  <img
                    src={sponsor.imageUrl || DEFAULT_SPONSOR_LOGO}
                    alt={sponsor.name}
                    className="h-48 w-48 mx-auto object-contain rounded-full transition duration-300"
                    loading="lazy"
                    onError={handleImageError}
                  />
                </a>
              </div>
            ))}
          </Slider>
        )}

        {!isLoading && !isError && sponsorsData.length === 0 && (
          <p className="text-center text-gray-500 py-10">
            We are currently seeking sponsors.
          </p>
        )}
      </div>
    </section>
  );
}

export default SponsorsCarousel;
