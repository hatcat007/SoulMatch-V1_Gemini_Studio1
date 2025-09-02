import React from 'react';

interface IconCloudProps {
  images: string[];
}

const IconCloud: React.FC<IconCloudProps> = ({ images }) => {
  const radius = 120; // Radius of the circle in pixels
  const totalImages = images.length;
  const angleStep = 360 / totalImages;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .animate-spin-slow {
            animation: spin 25s linear infinite;
          }
        `}
      </style>
      <div className="relative w-64 h-64 animate-spin-slow">
        {images.map((src, index) => {
          const angle = angleStep * index;
          const imageStyle: React.CSSProperties = {
            position: 'absolute',
            top: '50%',
            left: '50%',
            margin: '-24px', // Half of the image size (48px)
            transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`,
          };

          return (
            <div key={index} style={imageStyle}>
              <img
                src={src}
                alt={`icon-${index}`}
                className="w-12 h-12 rounded-full object-cover shadow-md"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IconCloud;
