import { useState } from 'react'
import { CartItem } from '../types'

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const handleAddToCart = (item: CartItem) => {
    setCart(previous => previous.some(existing => existing.id.toLowerCase() === item.id.toLowerCase()) ? previous : [...previous, item])
  }

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const handleClearCart = () => setCart([])

  return { cart, handleAddToCart, handleRemoveFromCart, handleClearCart, setCart }
}
