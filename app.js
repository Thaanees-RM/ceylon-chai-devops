        const { useState, useEffect } = React;

        const MENU_STORAGE_KEY = 'ceylonChaiMenuItems';
        const STORE_STORAGE_KEY = 'ceylonChaiStoreInfo';
        const MENU_TABLE = window.SUPABASE_MENU_TABLE || 'menu_items';
        const STORE_TABLE = window.SUPABASE_STORE_TABLE || 'store_settings';
        const DEFAULT_LOGO_IMAGE = 'images/logo.svg';

        function getSupabaseClient() {
            if (!window.supabase) {
                return null;
            }

            if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
                return null;
            }

            return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }

        const DEFAULT_MENU_ITEMS = [
            {
                id: 1,
                category: 'tea',
                name: 'Baathaam Tea',
                description: 'Rich aromatic tea with traditional spices and herbs',
                price: 'Rs. 250',
                image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=500',
                badge: 'Popular'
            },
            {
                id: 2,
                category: 'tea',
                name: 'Masala Chai',
                description: 'Authentic spiced tea with cardamom, ginger, and cloves',
                price: 'Rs. 280',
                image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=500',
                badge: 'Hot'
            },
            {
                id: 3,
                category: 'tea',
                name: 'Milk Tea',
                description: 'Creamy milk tea with perfect sweetness',
                price: 'Rs. 200',
                image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500',
                badge: 'Bestseller'
            },
            {
                id: 4,
                category: 'food',
                name: 'Chicken Shawarma',
                description: 'Tender marinated chicken with fresh vegetables and special sauce',
                price: 'Rs. 450',
                image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500',
                badge: 'Signature'
            },
            {
                id: 5,
                category: 'food',
                name: 'Beef Burger',
                description: 'Juicy beef patty with cheese, lettuce, and our special sauce',
                price: 'Rs. 550',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
                badge: 'New'
            },
            {
                id: 6,
                category: 'food',
                name: 'Submarine',
                description: 'Loaded submarine with chicken, vegetables, and sauces',
                price: 'Rs. 400',
                image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500',
                badge: 'Popular'
            },
            {
                id: 7,
                category: 'drinks',
                name: 'Mango Mojito',
                description: 'Refreshing mango mojito with fresh mint and lime',
                price: 'Rs. 350',
                image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
                badge: 'Refreshing'
            },
            {
                id: 8,
                category: 'drinks',
                name: 'Fresh Juice',
                description: 'Seasonal fresh fruit juice packed with vitamins',
                price: 'Rs. 300',
                image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500',
                badge: 'Healthy'
            },
            {
                id: 9,
                category: 'food',
                name: 'Buns',
                description: 'Soft freshly baked buns with various fillings',
                price: 'Rs. 150',
                image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
                badge: 'Fresh'
            }
        ];

        const DEFAULT_STORE_INFO = {
            openingDays: 'Every Day',
            openingHours: '5:00 PM - 2:00 AM',
            phone: '+94 70 392 3931',
            address: 'Sri Lanka',
            mapUrl: 'https://maps.app.goo.gl/CTwFqKEPF2g95mrE9',
            instagramHandle: '@ceylon_chaii',
            instagramUrl: 'https://www.instagram.com/ceylon_chaii',
            announcement: 'Weekend offer: 10% off selected tea and food combos.',
            logoImage: DEFAULT_LOGO_IMAGE
        };

        function normalizeMenuItems(menuData) {
            if (!Array.isArray(menuData)) {
                return null;
            }

            return menuData.map(item => ({
                id: item.id,
                category: item.category,
                name: item.name,
                description: item.description || '',
                price: item.price || '',
                image: item.image || '',
                badge: item.badge || ''
            }));
        }

        function normalizeStoreInfo(storeData, previousStoreInfo) {
            if (!storeData) {
                return previousStoreInfo;
            }

            return {
                ...previousStoreInfo,
                openingDays: storeData.opening_days || previousStoreInfo.openingDays,
                openingHours: storeData.opening_hours || previousStoreInfo.openingHours,
                phone: storeData.phone || previousStoreInfo.phone,
                address: storeData.address || previousStoreInfo.address,
                mapUrl: storeData.map_url || previousStoreInfo.mapUrl,
                instagramHandle: storeData.instagram_handle || previousStoreInfo.instagramHandle,
                instagramUrl: storeData.instagram_url || previousStoreInfo.instagramUrl,
                announcement: storeData.announcement || previousStoreInfo.announcement,
                logoImage: storeData.logo_image || previousStoreInfo.logoImage
            };
        }

        function CeylonChaiApp() {
            const supabase = getSupabaseClient();
            const [activeCategory, setActiveCategory] = useState('all');
            const [cartCount, setCartCount] = useState(0);
            const [showScrollTop, setShowScrollTop] = useState(false);
            const [isLoading, setIsLoading] = useState(true);
            const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
            const [toastMessage, setToastMessage] = useState('');
            const [isToastVisible, setIsToastVisible] = useState(false);
            const [toastKey, setToastKey] = useState(0);
            const [menuItems, setMenuItems] = useState([]);
            const [storeInfo, setStoreInfo] = useState(DEFAULT_STORE_INFO);

            const reviews = [
                {
                    name: 'Kamal Perera',
                    rating: 5,
                    text: 'Best tea in town! The Masala Chai is absolutely amazing. The ambiance and service are top-notch. Highly recommended!',
                    avatar: 'K'
                },
                {
                    name: 'Nimal Silva',
                    rating: 5,
                    text: 'The shawarma is to die for! Fresh ingredients, generous portions, and incredible taste. Ceylon Chai never disappoints.',
                    avatar: 'N'
                },
                {
                    name: 'Saman Fernando',
                    rating: 5,
                    text: 'Great place to hang out with friends. The mojitos are refreshing and the burgers are juicy. Love the late-night hours!',
                    avatar: 'S'
                },
                {
                    name: 'Priya Jayasinghe',
                    rating: 5,
                    text: 'Authentic tea experience! The Baathaam tea reminds me of my grandmother\'s recipe. Cozy atmosphere and friendly staff.',
                    avatar: 'P'
                }
            ];

            useEffect(() => {
                const finishLoading = () => setIsLoading(false);

                if (document.readyState === 'complete') {
                    const rafId = requestAnimationFrame(finishLoading);
                    return () => cancelAnimationFrame(rafId);
                }

                const fallbackTimeout = setTimeout(finishLoading, 900);
                window.addEventListener('load', finishLoading, { once: true });

                return () => {
                    clearTimeout(fallbackTimeout);
                    window.removeEventListener('load', finishLoading);
                };
            }, []);

            useEffect(() => {
                let cancelled = false;

                const loadData = async () => {
                    try {
                        if (supabase) {
                            const { data: menuData, error: menuError } = await supabase
                                .from(MENU_TABLE)
                                .select('*')
                                .order('id', { ascending: true });

                            const normalizedMenu = normalizeMenuItems(menuData);
                            if (!menuError && normalizedMenu && !cancelled) {
                                setMenuItems(normalizedMenu);
                            }

                            const { data: storeData, error: storeError } = await supabase
                                .from(STORE_TABLE)
                                .select('*')
                                .eq('id', 1)
                                .single();

                            if (!storeError && storeData && !cancelled) {
                                setStoreInfo(prev => normalizeStoreInfo(storeData, prev));
                            }

                            if (!menuError || !storeError) {
                                return;
                            }
                        }

                        const storedMenu = localStorage.getItem(MENU_STORAGE_KEY);
                        const storedStore = localStorage.getItem(STORE_STORAGE_KEY);

                        if (storedMenu) {
                            const parsedMenu = JSON.parse(storedMenu);
                            if (Array.isArray(parsedMenu) && !cancelled) {
                                setMenuItems(parsedMenu);
                            }
                        }

                        if (storedStore) {
                            const parsedStore = JSON.parse(storedStore);
                            if (parsedStore && typeof parsedStore === 'object' && !cancelled) {
                                setStoreInfo(prev => ({ ...prev, ...parsedStore }));
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load saved store data:', error);
                    }
                };

                loadData();

                return () => {
                    cancelled = true;
                };
            }, []);

            useEffect(() => {
                if (!supabase) {
                    return undefined;
                }

                let cancelled = false;
                let refreshTimer = null;

                const refreshFromCloud = async () => {
                    try {
                        const [{ data: menuData }, { data: storeData, error: storeError }] = await Promise.all([
                            supabase
                                .from(MENU_TABLE)
                                .select('*')
                                .order('id', { ascending: true }),
                            supabase
                                .from(STORE_TABLE)
                                .select('*')
                                .eq('id', 1)
                                .single()
                        ]);

                        if (cancelled) {
                            return;
                        }

                        const normalizedMenu = normalizeMenuItems(menuData);
                        if (normalizedMenu) {
                            setMenuItems(normalizedMenu);
                        }

                        if (!storeError && storeData) {
                            setStoreInfo(prev => normalizeStoreInfo(storeData, prev));
                        }
                    } catch (error) {
                        console.error('Realtime sync refresh failed:', error);
                    }
                };

                const queueRefresh = () => {
                    if (refreshTimer) {
                        clearTimeout(refreshTimer);
                    }

                    refreshTimer = setTimeout(() => {
                        refreshFromCloud();
                    }, 220);
                };

                const channel = supabase
                    .channel('ceylon-chai-live-sync')
                    .on('postgres_changes', { event: '*', schema: 'public', table: MENU_TABLE }, queueRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: STORE_TABLE }, queueRefresh)
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            queueRefresh();
                        }
                    });

                return () => {
                    cancelled = true;

                    if (refreshTimer) {
                        clearTimeout(refreshTimer);
                    }

                    supabase.removeChannel(channel);
                };
            }, []);

            useEffect(() => {
                if (supabase) {
                    return undefined;
                }

                const handleStorageSync = (event) => {
                    if (event.key === MENU_STORAGE_KEY && event.newValue) {
                        try {
                            const nextMenu = JSON.parse(event.newValue);
                            if (Array.isArray(nextMenu)) {
                                setMenuItems(nextMenu);
                            }
                        } catch (error) {
                            console.error('Failed to sync menu from local storage event:', error);
                        }
                    }

                    if (event.key === STORE_STORAGE_KEY && event.newValue) {
                        try {
                            const nextStore = JSON.parse(event.newValue);
                            if (nextStore && typeof nextStore === 'object') {
                                setStoreInfo(prev => ({ ...prev, ...nextStore }));
                            }
                        } catch (error) {
                            console.error('Failed to sync store from local storage event:', error);
                        }
                    }
                };

                window.addEventListener('storage', handleStorageSync);
                return () => window.removeEventListener('storage', handleStorageSync);
            }, [supabase]);

            useEffect(() => {
                // Scroll event listener
                const handleScroll = () => {
                    setShowScrollTop(window.scrollY > 300);
                };

                window.addEventListener('scroll', handleScroll);

                // GSAP Animations
                if (typeof gsap !== 'undefined') {
                    gsap.registerPlugin(ScrollTrigger);

                    // Parallax effect
                    gsap.to('.parallax-layer', {
                        scrollTrigger: {
                            trigger: 'body',
                            start: 'top top',
                            end: 'bottom bottom',
                            scrub: true
                        },
                        y: 300,
                        ease: 'none'
                    });

                    // Menu cards animation
                    gsap.utils.toArray('.menu-card').forEach((card, i) => {
                        gsap.from(card, {
                            scrollTrigger: {
                                trigger: card,
                                start: 'top bottom-=100',
                                toggleActions: 'play none none reverse'
                            },
                            y: 100,
                            opacity: 0,
                            duration: 0.8,
                            delay: i * 0.1,
                            ease: 'power3.out'
                        });
                    });

                    // Review cards animation
                    gsap.utils.toArray('.review-card').forEach((card, i) => {
                        gsap.from(card, {
                            scrollTrigger: {
                                trigger: card,
                                start: 'top bottom-=100',
                                toggleActions: 'play none none reverse'
                            },
                            x: i % 2 === 0 ? -100 : 100,
                            opacity: 0,
                            duration: 0.8,
                            delay: i * 0.15,
                            ease: 'power3.out'
                        });
                    });
                }

                return () => window.removeEventListener('scroll', handleScroll);
            }, []);

            // Ensure mobile menu is closed when switching to desktop layout.
            useEffect(() => {
                const closeMenuOnDesktop = () => {
                    if (window.innerWidth > 768) {
                        setIsMobileMenuOpen(false);
                    }
                };

                window.addEventListener('resize', closeMenuOnDesktop);
                return () => window.removeEventListener('resize', closeMenuOnDesktop);
            }, []);

            useEffect(() => {
                if (!isToastVisible) {
                    return undefined;
                }

                const timeoutId = setTimeout(() => {
                    setIsToastVisible(false);
                }, 2200);

                return () => clearTimeout(timeoutId);
            }, [isToastVisible, toastKey]);

            const filteredItems = activeCategory === 'all' 
                ? menuItems 
                : menuItems.filter(item => item.category === activeCategory);

            const addToCart = (itemName) => {
                setCartCount(prev => prev + 1);
                setToastMessage(`${itemName} added to cart`);
                setToastKey(prev => prev + 1);
                setIsToastVisible(true);
            };

            const scrollToTop = () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            return (
                <>
                    {/* Loading Screen */}
                    <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`}>
                        <div className="tea-cup-loader">
                            <div className="cup"></div>
                        </div>
                    </div>

                    {/* Animated Background */}
                    <div className="animated-bg"></div>
                    <div className="grain-overlay"></div>
                    <div className="parallax-layer"></div>

                    {/* Navigation */}
                    <nav>
                        <div className="nav-content">
                            <div className="logo-container">
                                <img
                                    src={storeInfo.logoImage || DEFAULT_LOGO_IMAGE}
                                    alt="Ceylon Chai Logo"
                                    className="logo-img"
                                    onError={(event) => {
                                        if (event.currentTarget.src.indexOf(DEFAULT_LOGO_IMAGE) === -1) {
                                            event.currentTarget.src = DEFAULT_LOGO_IMAGE;
                                        }
                                    }}
                                />
                                <div className="logo-text">Ceylon Chai</div>
                            </div>
                            <ul className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
                                <li><a href="#home" onClick={() => setIsMobileMenuOpen(false)}>Home</a></li>
                                <li><a href="#menu" onClick={() => setIsMobileMenuOpen(false)}>Menu</a></li>
                                <li><a href="#gallery" onClick={() => setIsMobileMenuOpen(false)}>Gallery</a></li>
                                <li><a href="#reviews" onClick={() => setIsMobileMenuOpen(false)}>Reviews</a></li>
                                <li><a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a></li>
                                <li><a href="admin.html" target="_blank" rel="noreferrer">Admin</a></li>
                            </ul>
                            <button
                                className={`mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`}
                                type="button"
                                aria-label="Toggle navigation"
                                aria-expanded={isMobileMenuOpen}
                                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                            >
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                        </div>
                    </nav>

                    {storeInfo.announcement && (
                        <div className="announcement-bar">
                            <i className="fas fa-bullhorn"></i>
                            <span>{storeInfo.announcement}</span>
                        </div>
                    )}

                    {/* Hero Section */}
                    <section id="home" className="hero">
                        <div className="steam-effect">
                            <div className="steam"></div>
                            <div className="steam"></div>
                            <div className="steam"></div>
                        </div>
                        <div className="hero-content">
                            <h1 className="hero-title">Ceylon Chai</h1>
                            <p className="hero-subtitle">Where Every Sip Tells a Story</p>
                            <p className="hero-description">
                                Experience the authentic taste of Ceylon with our handcrafted teas, 
                                delicious shawarmas, gourmet burgers, and refreshing beverages. 
                                Open late into the night to serve your cravings.
                            </p>
                            <div className="cta-buttons">
                                <button className="magnetic-btn btn-primary" onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })}>
                                    <i className="fas fa-utensils"></i> Explore Menu
                                </button>
                                <button className="magnetic-btn btn-secondary" onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}>
                                    <i className="fas fa-map-marker-alt"></i> Visit Us
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Menu Section */}
                    <section id="menu" className="menu-section">
                        <div className="container">
                            <h2 className="section-title">Our Menu</h2>
                            <p className="section-subtitle">Discover our delicious selection of teas, food, and beverages</p>
                            
                            <div className="category-filter">
                                <button 
                                    className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                                    onClick={() => setActiveCategory('all')}
                                >
                                    All Items
                                </button>
                                <button 
                                    className={`filter-btn ${activeCategory === 'tea' ? 'active' : ''}`}
                                    onClick={() => setActiveCategory('tea')}
                                >
                                    <i className="fas fa-mug-hot"></i> Tea
                                </button>
                                <button 
                                    className={`filter-btn ${activeCategory === 'food' ? 'active' : ''}`}
                                    onClick={() => setActiveCategory('food')}
                                >
                                    <i className="fas fa-hamburger"></i> Food
                                </button>
                                <button 
                                    className={`filter-btn ${activeCategory === 'drinks' ? 'active' : ''}`}
                                    onClick={() => setActiveCategory('drinks')}
                                >
                                    <i className="fas fa-cocktail"></i> Drinks
                                </button>
                            </div>

                            <div className="menu-grid">
                                {filteredItems.map(item => (
                                    <div key={item.id} className={`menu-card ${item.category === 'food' ? 'food-card' : ''}`}>
                                        <div className="card-image-container">
                                            <img src={item.image} alt={item.name} className="card-image" loading="lazy" decoding="async" />
                                            {item.badge && <div className="card-badge">{item.badge}</div>}
                                            <div className="liquid-effect"></div>
                                        </div>
                                        <div className="card-content">
                                            <h3 className="card-title">{item.name}</h3>
                                            <p className="card-description">{item.description}</p>
                                            <div className="card-footer">
                                                <div className="card-price">{item.price}</div>
                                                <button 
                                                    className="add-to-cart-btn"
                                                    onClick={() => addToCart(item.name)}
                                                >
                                                    <i className="fas fa-cart-plus"></i> Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Reviews Section */}
                    <section id="reviews" className="reviews-section">
                        <div className="container">
                            <h2 className="section-title">What Our Customers Say</h2>
                            <p className="section-subtitle">Real reviews from real customers</p>
                            
                            <div className="reviews-grid">
                                {reviews.map((review, index) => (
                                    <div key={index} className="review-card">
                                        <div className="review-header">
                                            <div className="reviewer-avatar">{review.avatar}</div>
                                            <div className="reviewer-info">
                                                <h4>{review.name}</h4>
                                                <div className="stars">
                                                    {[...Array(review.rating)].map((_, i) => (
                                                        <i key={i} className="fas fa-star"></i>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="review-text">{review.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Gallery Section */}
                    <section id="gallery" className="gallery-section">
                        <div className="container">
                            <h2 className="section-title">Gallery</h2>
                            <p className="section-subtitle">A glimpse into our culinary world</p>
                            
                            <div className="gallery-grid">
                                <div className="gallery-item">
                                    <img src="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500" alt="Tea brewing" loading="lazy" decoding="async" />
                                    <div className="gallery-overlay">
                                        <h4 className="gallery-title">Brewing Perfection</h4>
                                    </div>
                                </div>
                                <div className="gallery-item">
                                    <img src="https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500" alt="Food preparation" loading="lazy" decoding="async" />
                                    <div className="gallery-overlay">
                                        <h4 className="gallery-title">Fresh Ingredients</h4>
                                    </div>
                                </div>
                                <div className="gallery-item">
                                    <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500" alt="Cafe ambiance" loading="lazy" decoding="async" />
                                    <div className="gallery-overlay">
                                        <h4 className="gallery-title">Cozy Atmosphere</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section id="contact" className="contact-section">
                        <div className="container">
                            <h2 className="section-title">Get In Touch</h2>
                            <p className="section-subtitle">We'd love to hear from you</p>
                            
                            <div className="contact-grid">
                                <div className="contact-card">
                                    <i className="fas fa-phone contact-icon"></i>
                                    <h3>Call Us</h3>
                                    <p><a href={`tel:${storeInfo.phone.replace(/\s+/g, '')}`}>{storeInfo.phone}</a></p>
                                    <p>Available during business hours</p>
                                </div>
                                <div className="contact-card">
                                    <i className="fab fa-instagram contact-icon"></i>
                                    <h3>Follow Us</h3>
                                    <p><a href={storeInfo.instagramUrl} target="_blank" rel="noreferrer">{storeInfo.instagramHandle}</a></p>
                                    <p>Daily menu updates</p>
                                </div>
                                <div className="contact-card">
                                    <i className="fas fa-map-marker-alt contact-icon"></i>
                                    <h3>Visit Us</h3>
                                    <p><a href={storeInfo.mapUrl} target="_blank" rel="noreferrer">View on Maps</a></p>
                                    <p>{storeInfo.address}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer>
                        <div className="footer-content">
                            <div className="footer-section">
                                <h3>About Ceylon Chai</h3>
                                <p>
                                    We serve authentic Ceylon tea and delicious food with passion. 
                                    Established in 2023, we've been serving our community with 
                                    quality and love.
                                </p>
                                <div className="social-links">
                                    <a href={storeInfo.instagramUrl} target="_blank" rel="noreferrer" className="social-icon">
                                        <i className="fab fa-instagram"></i>
                                    </a>
                                    <a href="https://www.facebook.com" target="_blank" className="social-icon">
                                        <i className="fab fa-facebook"></i>
                                    </a>
                                    <a href={`tel:${storeInfo.phone.replace(/\s+/g, '')}`} className="social-icon">
                                        <i className="fas fa-phone"></i>
                                    </a>
                                </div>
                            </div>
                            <div className="footer-section">
                                <h3>Quick Links</h3>
                                <a href="#menu">Menu</a>
                                <a href="#reviews">Reviews</a>
                                <a href="#gallery">Gallery</a>
                                <a href="#contact">Contact</a>
                                <a href="admin.html" target="_blank" rel="noreferrer">Admin Panel</a>
                            </div>
                            <div className="footer-section">
                                <h3>Opening Hours</h3>
                                <p>{storeInfo.openingDays}</p>
                                <p>{storeInfo.openingHours}</p>
                                <p>We are open every day.</p>
                            </div>
                            <div className="footer-section">
                                <h3>Contact Info</h3>
                                <p>Phone: {storeInfo.phone}</p>
                                <p>Instagram: {storeInfo.instagramHandle}</p>
                                <p><a href={storeInfo.mapUrl} target="_blank" rel="noreferrer">Get Directions</a></p>
                            </div>
                        </div>
                        <div className="footer-bottom">
                            <p>&copy; {new Date().getFullYear()} Ceylon Chai. All rights reserved. Serving authentic Ceylon tea and quality dining experiences every day.</p>
                        </div>
                    </footer>

                    {/* Floating Cart Icon */}
                    <div className="cart-icon-container">
                        <div className="cart-icon">
                            <i className="fas fa-shopping-cart"></i>
                            {cartCount > 0 && <div className="cart-count">{cartCount}</div>}
                        </div>
                    </div>

                    <a href="admin.html" target="_blank" rel="noreferrer" className="admin-float-btn" aria-label="Open Admin Panel">
                        <i className="fas fa-user-cog"></i>
                        <span>Admin</span>
                    </a>

                    {/* Scroll to Top */}
                    <div 
                        className={`scroll-top ${showScrollTop ? 'visible' : ''}`}
                        onClick={scrollToTop}
                    >
                        <i className="fas fa-arrow-up"></i>
                    </div>

                    {isToastVisible && (
                        <div key={toastKey} className="cart-toast" role="status" aria-live="polite">
                            <i className="fas fa-check-circle"></i>
                            <span>{toastMessage}</span>
                        </div>
                    )}
                </>
            );
        }

        ReactDOM.render(<CeylonChaiApp />, document.getElementById('root'));
