import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';

const AvatarGraphic: React.FC<{ images: string[] }> = ({ images }) => {
    // This is the inner part that does the rendering
    if (images.length < 6) return null;

    const mainImage = images[0];
    const orbitingImages = images.slice(1, 6);

    const positions = [
        "w-14 h-14 absolute top-0 left-0 transform -translate-x-4 -translate-y-4",
        "w-12 h-12 absolute top-0 right-0 transform translate-x-4 -translate-y-2",
        "w-10 h-10 absolute bottom-0 right-0 transform translate-x-5 translate-y-3",
        "w-16 h-16 absolute bottom-0 left-0 transform -translate-x-6 translate-y-2",
        "w-8 h-8 absolute top-1/2 -left-10",
    ];

    return (
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80">
            <motion.img
                key={mainImage}
                src={mainImage}
                alt="Main user"
                className="rounded-full w-full h-full border-4 border-white shadow-lg object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: ["-4px", "4px"] }}
                transition={{
                    opacity: { duration: 2.0, ease: 'easeInOut' },
                    y: {
                        duration: 6,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                    },
                }}
            />
            {orbitingImages.map((src, index) => (
                <motion.img
                    key={src}
                    src={src}
                    alt={`User ${index + 1}`}
                    className={`rounded-full shadow-md object-cover ${positions[index]}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: ["-6px", "6px"] }}
                    transition={{
                        opacity: { duration: 2.0, ease: 'easeInOut' },
                        y: {
                            duration: 4 + Math.random() * 3,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: Math.random() * 2,
                        },
                    }}
                />
            ))}
        </div>
    );
};

const AnimatedAvatarGraphic: React.FC = () => {
    const [allImages, setAllImages] = useState<string[]>([]);
    const [displayImages, setDisplayImages] = useState<string[]>([]);

    useEffect(() => {
        const fetchImages = async () => {
            const { data, error } = await supabase.from('onboarding_images').select('image_url');
            if (error) {
                console.error("Error fetching onboarding images:", error);
            } else if (data && data.length > 0) {
                setAllImages(data.map(item => item.image_url));
            }
        };
        fetchImages();
    }, []);

    useEffect(() => {
        if (allImages.length < 6) return;

        const initialShuffled = [...allImages].sort(() => 0.5 - Math.random());
        setDisplayImages(initialShuffled.slice(0, 6));

        const interval = setInterval(() => {
            setDisplayImages(currentDisplayImages => {
                if (currentDisplayImages.length === 0) return [];
                const imageSlotToUpdate = Math.floor(Math.random() * currentDisplayImages.length);
                let newImage = '';
                const availableImages = allImages.filter(img => !currentDisplayImages.includes(img));
                if (availableImages.length > 0) {
                     newImage = availableImages[Math.floor(Math.random() * availableImages.length)];
                } else {
                    newImage = allImages[Math.floor(Math.random() * allImages.length)];
                }
                const nextDisplayImages = [...currentDisplayImages];
                nextDisplayImages[imageSlotToUpdate] = newImage;
                return nextDisplayImages;
            });
        }, 2500);

        return () => clearInterval(interval);
    }, [allImages]);
    
    if (displayImages.length < 6) {
        return <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gray-200 dark:bg-dark-surface-light rounded-full animate-pulse" />;
    }

    return (
        <motion.div
            key="avatar-graphic-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
            <AvatarGraphic images={displayImages} />
        </motion.div>
    );
};

export default AnimatedAvatarGraphic;
