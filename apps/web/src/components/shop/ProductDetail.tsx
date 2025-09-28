'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  subcategory: string;
  brand: string;
  tags: string[];
  inStock: boolean;
  stockQuantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  targetSize: string[];
  targetAge: string[];
  ingredients?: string[];
  nutritionalInfo?: {
    protein: number;
    fat: number;
    fiber: number;
    moisture: number;
    calories: number;
  };
  rating: number;
  reviewCount: number;
  reviews: Review[];
  subscription?: {
    enabled: boolean;
    discount: number;
    frequencies: string[];
  };
  relatedProducts?: string[];
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  createdAt: string;
  helpfulCount: number;
}

interface ProductDetailProps {
  productId: string;
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const productData = await response.json();
        setProduct(productData);

        // Track product view
        trackEvent('view_item', {
          currency: 'EUR',
          value: productData.price,
          items: [{
            item_id: productData.id,
            item_name: productData.name,
            item_category: productData.category,
            item_brand: productData.brand,
            price: productData.price
          }]
        });
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async () => {
    if (!product) return;

    const price = selectedFrequency && product.subscription?.enabled
      ? product.price * (1 - product.subscription.discount / 100)
      : product.price;

    trackEvent('add_to_cart', {
      currency: 'EUR',
      value: price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand,
        price: price,
        quantity: quantity
      }]
    });

    // Add to cart logic here
    console.log('Adding to cart:', {
      productId,
      quantity,
      frequency: selectedFrequency
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ⭐
      </span>
    ));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Prodotto non trovato</h1>
          <p className="text-gray-600 mb-6">Il prodotto richiesto non esiste.</p>
          <Link href="/shop">
            <Button>Torna al catalogo</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/shop" className="text-orange-600 hover:text-orange-800">
          Shop
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/shop?category=${product.category}`} className="text-orange-600 hover:text-orange-800">
          {product.category}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-6xl">📦</span>
              </div>
            )}
          </div>

          {/* Thumbnail Images */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-gray-100 rounded overflow-hidden border-2 ${
                    selectedImage === index ? 'border-orange-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                {product.brand}
              </span>
              {!product.inStock && (
                <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  Non disponibile
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex">{renderStars(Math.round(product.rating))}</div>
              <span className="text-sm text-gray-600">
                {product.rating.toFixed(1)} ({product.reviewCount} recensioni)
              </span>
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-gray-900">
                €{(selectedFrequency && product.subscription?.enabled
                  ? product.price * (1 - product.subscription.discount / 100)
                  : product.discountPrice || product.price
                ).toFixed(2)}
              </span>
              {(product.discountPrice || (selectedFrequency && product.subscription?.enabled)) && (
                <span className="text-xl text-gray-500 line-through">
                  €{product.price.toFixed(2)}
                </span>
              )}
            </div>
            {selectedFrequency && product.subscription?.enabled && (
              <div className="text-sm text-orange-600 mt-1">
                Sconto abbonamento: -{product.subscription.discount}%
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Descrizione</h3>
            <p className="text-gray-600">{product.description}</p>
          </div>

          {/* Subscription Options */}
          {product.subscription?.enabled && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Abbonamento (opzionale)</h3>
              <select
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="">Acquisto singolo</option>
                {product.subscription.frequencies.map((freq) => (
                  <option key={freq} value={freq}>
                    Ogni {freq} (Risparmia {product.subscription!.discount}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Quantità</h3>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-32 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              {Array.from({ length: Math.min(10, product.stockQuantity) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            {product.inStock && product.stockQuantity <= 5 && (
              <div className="text-sm text-orange-600 mt-1">
                Solo {product.stockQuantity} disponibili!
              </div>
            )}
          </div>

          {/* Add to Cart */}
          <div className="space-y-3">
            <Button
              onClick={addToCart}
              disabled={!product.inStock}
              className="w-full text-lg py-3"
              data-cta-id={`product_${product.id}.add_to_cart.click`}
            >
              {product.inStock ? 'Aggiungi al carrello' : 'Non disponibile'}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="w-full"
                data-cta-id={`product_${product.id}.add_to_wishlist.click`}
              >
                ❤️ Lista desideri
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                data-cta-id={`product_${product.id}.share.click`}
              >
                📤 Condividi
              </Button>
            </div>
          </div>

          {/* Product Features */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Caratteristiche</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Categoria:</span> {product.category}
              </div>
              <div>
                <span className="font-medium">Taglia:</span> {product.targetSize.join(', ')}
              </div>
              <div>
                <span className="font-medium">Età:</span> {product.targetAge.join(', ')}
              </div>
              {product.weight && (
                <div>
                  <span className="font-medium">Peso:</span> {product.weight}kg
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Tabs */}
      <div className="mt-12">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setShowReviews(false)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                !showReviews
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Dettagli prodotto
            </button>
            <button
              onClick={() => setShowReviews(true)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                showReviews
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Recensioni ({product.reviewCount})
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {!showReviews ? (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Ingredients */}
              {product.ingredients && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Ingredienti</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {product.ingredients.map((ingredient, index) => (
                      <li key={index}>• {ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nutritional Info */}
              {product.nutritionalInfo && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Valori nutrizionali</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Proteine: {product.nutritionalInfo.protein}%</div>
                    <div>Grassi: {product.nutritionalInfo.fat}%</div>
                    <div>Fibre: {product.nutritionalInfo.fiber}%</div>
                    <div>Umidità: {product.nutritionalInfo.moisture}%</div>
                    <div>Calorie: {product.nutritionalInfo.calories} kcal/100g</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {product.reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Nessuna recensione ancora.</p>
                  <Button className="mt-4" data-cta-id={`product_${product.id}.write_review.click`}>
                    Scrivi la prima recensione
                  </Button>
                </div>
              ) : (
                product.reviews.map((review) => (
                  <Card key={review.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.userName}</span>
                          {review.verified && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              Acquisto verificato
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex">{renderStars(review.rating)}</div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <h4 className="font-medium mb-2">{review.title}</h4>
                    <p className="text-gray-600 mb-3">{review.content}</p>
                    <div className="flex items-center space-x-2">
                      <button className="text-sm text-gray-500 hover:text-gray-700">
                        👍 Utile ({review.helpfulCount})
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}