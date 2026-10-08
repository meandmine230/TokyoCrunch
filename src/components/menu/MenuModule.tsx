import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, ProductVariant, ProductAddon, Ingredient, RecipeItem } from '../../types';
import { getAllFromStore, saveToStore, deleteFromStore, addAuditLog } from '../../db/indexedDB';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  FolderPlus,
  Power,
  Flame,
  Scroll,
  Minus,
} from 'lucide-react';

export const MenuModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Simple-Side BOM Drawer State
  const [bomProduct, setBomProduct] = useState<Product | null>(null);
  const [bomVariantName, setBomVariantName] = useState<string>('Standard');
  const [bomAddIngredientId, setBomAddIngredientId] = useState<string>('');
  const [bomAddQty, setBomAddQty] = useState<number>(1);

  // Modal State for Products
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodBasePrice, setProdBasePrice] = useState<number>(0);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [prodAddons, setProdAddons] = useState<ProductAddon[]>([]);
  const [prodAvailable, setProdAvailable] = useState(true);
  const [prodIsPopular, setProdIsPopular] = useState(false);

  // Variant input row
  const [varNameInput, setVarNameInput] = useState('');
  const [varPriceInput, setVarPriceInput] = useState<number>(0);

  // Modal State for Categories
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const [c, p, ings, recs] = await Promise.all([
          getAllFromStore<Category>('categories'),
          getAllFromStore<Product>('products'),
          getAllFromStore<Ingredient>('ingredients'),
          getAllFromStore<RecipeItem>('recipes'),
        ]);
        setCategories(c.sort((a, b) => a.displayOrder - b.displayOrder));
        setProducts(p);
        setIngredients(ings);
        setRecipes(recs);
        if (ings.length > 0 && !bomAddIngredientId) {
          setBomAddIngredientId(ings[0].id);
        }
      } catch (err) {
        console.error('Failed to load menu data', err);
      }
    };
    loadMenu();
  }, [dataVersion]);

  // Open Product Modal (New or Edit)
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProductId(product.id);
      setProdName(product.name);
      setProdCatId(product.categoryId);
      setProdDesc(product.description || '');
      setProdBasePrice(product.basePrice);
      setProdVariants([...product.variants]);
      setProdAddons([...product.addons]);
      setProdAvailable(product.available);
      setProdIsPopular(!!product.isPopular);
    } else {
      setEditingProductId(null);
      setProdName('');
      setProdCatId(categories[0]?.id || '');
      setProdDesc('');
      setProdBasePrice(350);
      setProdVariants([{ name: 'Standard', price: 350 }]);
      setProdAddons([
        { id: 'addon-cheese', name: 'Cheese Slice', price: 50 },
        { id: 'addon-jalapeno', name: 'Jalapeno', price: 50 },
      ]);
      setProdAvailable(true);
      setProdIsPopular(false);
    }
    setShowProductModal(true);
  };

  const handleAddVariant = () => {
    if (!varNameInput.trim() || varPriceInput <= 0) {
      showToast('Enter a valid variant name and price', 'warning');
      return;
    }
    setProdVariants((prev) => [...prev, { name: varNameInput.trim(), price: varPriceInput }]);
    setVarNameInput('');
    setVarPriceInput(0);
  };

  const handleRemoveVariant = (index: number) => {
    setProdVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('Product name is required', 'warning');
      return;
    }

    const productId = editingProductId || `prod-${Date.now()}`;
    const productVariantsToSave =
      prodVariants.length > 0 ? prodVariants : [{ name: 'Standard', price: prodBasePrice }];

    const newProduct: Product = {
      id: productId,
      categoryId: prodCatId || categories[0]?.id,
      name: prodName.trim(),
      description: prodDesc.trim() || undefined,
      basePrice: prodBasePrice,
      variants: productVariantsToSave,
      addons: prodAddons,
      available: prodAvailable,
      isPopular: prodIsPopular,
    };

    await saveToStore('products', newProduct);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: editingProductId ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      module: 'Menu',
      details: `${newProduct.name} saved. Price: ${newProduct.basePrice}`,
    });

    showToast(`Product ${newProduct.name} saved`, 'success');
    setShowProductModal(false);
    triggerDataRefresh();
  };

  // Toggle Availability
  const handleToggleAvailability = async (product: Product) => {
    const updated = { ...product, available: !product.available };
    await saveToStore('products', updated);
    showToast(
      `${product.name} is now ${updated.available ? 'Available' : 'Disabled'}`,
      'info'
    );
    triggerDataRefresh();
  };

  // Open Simple-Side BOM Drawer
  const handleOpenBomDrawer = (product: Product) => {
    setBomProduct(product);
    setBomVariantName(product.variants[0]?.name || 'Standard');
    setBomAddQty(1);
  };

  // Add Ingredient in BOM Drawer
  const handleAddBomIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomProduct || !bomAddIngredientId || bomAddQty <= 0) return;

    const activeRecipes = recipes.filter(
      (r) =>
        r.productId === bomProduct.id &&
        (!r.variantName || r.variantName === bomVariantName || bomVariantName === 'Standard')
    );
    const existing = activeRecipes.find((r) => r.ingredientId === bomAddIngredientId);
    if (existing) {
      const updatedQty = Number((existing.quantity + bomAddQty).toFixed(3));
      const updated: RecipeItem = { ...existing, quantity: updatedQty };
      await saveToStore('recipes', updated);
      setRecipes((prev) => prev.map((r) => (r.id === existing.id ? updated : r)));
      showToast(`Updated ingredient quantity to ${updatedQty}`, 'success');
      triggerDataRefresh();
      return;
    }

    const newItem: RecipeItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: bomProduct.id,
      variantName: bomVariantName,
      ingredientId: bomAddIngredientId,
      quantity: bomAddQty,
    };

    await saveToStore('recipes', newItem);
    setRecipes((prev) => [...prev, newItem]);
    showToast('Ingredient added to BOM', 'success');
    triggerDataRefresh();
  };

  // Inline BOM Qty update
  const handleUpdateBomQty = async (recipeId: string, delta: number) => {
    const item = recipes.find((r) => r.id === recipeId);
    if (!item) return;

    const newQty = Number(Math.max(0.001, item.quantity + delta).toFixed(3));
    const updated: RecipeItem = { ...item, quantity: newQty };
    await saveToStore('recipes', updated);
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? updated : r)));
    triggerDataRefresh();
  };

  // Remove BOM Ingredient
  const handleRemoveBomIngredient = async (recipeId: string) => {
    await deleteFromStore('recipes', recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    showToast('Ingredient removed from BOM', 'info');
    triggerDataRefresh();
  };

  // Add Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      displayOrder: categories.length + 1,
    };

    await saveToStore('categories', newCat);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CATEGORY_CREATED',
      module: 'Menu',
      details: `Created category: ${newCat.name}`,
    });

    showToast(`Category ${newCat.name} created`, 'success');
    setNewCatName('');
    setShowCategoryModal(false);
    triggerDataRefresh();
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCatId === 'all' || p.categoryId === selectedCatId;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Menu & Product Management</h2>
            <p className="text-[11px] text-zinc-400">
              Configure dishes, variants, prices & add-on choices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-zinc-400" />
            <span>+ Category</span>
          </button>
          <button
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-[#141417] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedCatId === 'all'
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCatId === c.id
                  ? 'bg-[#FF6B00] text-white font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/60'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredProducts.map((p) => {
          const categoryName = categories.find((c) => c.id === p.categoryId)?.name || 'General';

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                p.available
                  ? 'bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700'
                  : 'bg-zinc-950/70 border-zinc-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] px-2 py-0.5 rounded bg-[#FF6B00]/10">
                    {categoryName}
                  </span>
                  <button
                    onClick={() => handleToggleAvailability(p)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      p.available
                        ? 'border-emerald-800 text-emerald-400 hover:bg-emerald-950/40'
                        : 'border-zinc-700 text-zinc-500 hover:bg-zinc-800'
                    }`}
                    title={p.available ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-sm text-white">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}

                {/* Variants List */}
                <div className="mt-3 pt-2 border-t border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                    Variants & Prices:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.variants.map((v, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300"
                      >
                        {v.name}: <strong className="text-white">{settings.currency} {v.price}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* BOM Food Cost & Margin Preview */}
                {(() => {
                  const prodRecipes = recipes.filter((r) => r.productId === p.id);
                  let cost = 0;
                  for (const r of prodRecipes) {
                    const ing = ingredients.find((i) => i.id === r.ingredientId);
                    if (ing) cost += r.quantity * ing.unitCost;
                  }
                  const roundedCost = Math.round(cost);
                  const margin = p.basePrice > 0 ? Math.round(((p.basePrice - roundedCost) / p.basePrice) * 100) : 0;
                  return (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-500 font-sans">Recipe Food Cost:</span>
                      {prodRecipes.length > 0 ? (
                        <span className="text-amber-400 font-bold">
                          {settings.currency} {roundedCost} <span className="text-emerald-400 font-semibold font-sans">({margin}% margin)</span>
                        </span>
                      ) : (
                        <span className="text-red-400/90 font-sans text-[10px] font-medium">⚠️ No BOM defined</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-extrabold text-[#FF6B00]">
                  From {settings.currency} {p.basePrice}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenBomDrawer(p)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF6B00] border border-[#FF6B00]/30 text-xs font-semibold transition-colors"
                    title="Edit Recipe Bill of Materials in simple side"
                  >
                    <Scroll className="w-3.5 h-3.5" />
                    <span>BOM</span>
                  </button>

                  <button
                    onClick={() => handleOpenProductModal(p)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div>
              <h3 className="font-bold text-lg text-white">
                {editingProductId ? 'Edit Product' : 'Add New Menu Item'}
              </h3>
              <p className="text-xs text-zinc-400">
                Changes will immediately reflect in the POS and receipt generation
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Zinger Max Burger"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={prodCatId}
                    onChange={(e) => setProdCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Base / Starting Price ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodBasePrice || ''}
                    onChange={(e) => setProdBasePrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Short Description
                </label>
                <textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="e.g. Crispy fried chicken breast, secret spicy mayo, fresh iceberg"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

              {/* Variants Configuration */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase">
                  Portion Sizes & Variants
                </label>

                {/* Variant list */}
                <div className="space-y-1.5">
                  {prodVariants.map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                    >
                      <span className="font-semibold text-white">{v.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#FF6B00]">
                          {settings.currency} {v.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Variant Inputs */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={varNameInput}
                    onChange={(e) => setVarNameInput(e.target.value)}
                    placeholder="Variant (e.g. Double, 4 pcs)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="number"
                    value={varPriceInput || ''}
                    onChange={(e) => setVarPriceInput(Number(e.target.value) || 0)}
                    placeholder="Price"
                    className="w-24 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodAvailable}
                    onChange={(e) => setProdAvailable(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-[#FF6B00] focus:ring-0"
                  />
                  <span>Available for ordering</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodIsPopular}
                    onChange={(e) => setProdIsPopular(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-[#FF6B00] focus:ring-0"
                  />
                  <span>Mark as Hot / Best Seller</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs shadow-lg shadow-[#FF6B00]/20"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCategory}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Create Category</h3>
              <p className="text-xs text-zinc-400">Group your products for quick POS filtering</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Beverages & Shakes"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold text-xs"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- SIMPLE-SIDE BOM DRAWER MODAL ---------------- */}
      {bomProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Scroll className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="font-extrabold text-white text-base">
                    Recipe BOM: {bomProduct.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase">
                    Simple Side Editor
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure raw materials & portion sizes. Food cost and profit margins update automatically.
                </p>
              </div>

              <button
                onClick={() => setBomProduct(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Variant Switcher & Metrics */}
            <div className="px-4 space-y-3">
              {bomProduct.variants.length > 1 && (
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
                  {bomProduct.variants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setBomVariantName(v.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        bomVariantName === v.name
                          ? 'bg-[#FF6B00] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {v.name} ({settings.currency} {v.price})
                    </button>
                  ))}
                </div>
              )}

              {/* 3 KPI Badges */}
              {(() => {
                const variantPrice =
                  bomProduct.variants.find((v) => v.name === bomVariantName)?.price ||
                  bomProduct.basePrice;
                const activeRecipes = recipes.filter(
                  (r) =>
                    r.productId === bomProduct.id &&
                    (!r.variantName || r.variantName === bomVariantName || bomVariantName === 'Standard')
                );
                let cost = 0;
                for (const r of activeRecipes) {
                  const ing = ingredients.find((i) => i.id === r.ingredientId);
                  if (ing) cost += r.quantity * ing.unitCost;
                }
                const roundedCost = Number(cost.toFixed(2));
                const profit = Math.max(0, variantPrice - roundedCost);
                const margin = variantPrice > 0 ? Math.round((profit / variantPrice) * 100) : 0;

                return (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase">Selling Price</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {settings.currency} {variantPrice}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-amber-400 block uppercase">Raw Food Cost</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {settings.currency} {roundedCost}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-emerald-400 block uppercase">Net Profit Margin</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        +{settings.currency} {profit} ({margin}%)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Add Ingredient Input */}
            <form
              onSubmit={handleAddBomIngredient}
              className="px-4 flex items-center gap-2"
            >
              <select
                value={bomAddIngredientId}
                onChange={(e) => setBomAddIngredientId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({settings.currency} {ing.unitCost}/{ing.unit})
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="0.001"
                min="0.001"
                value={bomAddQty || ''}
                onChange={(e) => setBomAddQty(Number(e.target.value) || 0)}
                placeholder="Qty"
                className="w-20 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white text-center focus:outline-none focus:border-[#FF6B00]"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Components List */}
            <div className="flex-1 px-4 overflow-y-auto space-y-2">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/60">
                      <th className="py-2 px-3 font-semibold">Ingredient</th>
                      <th className="py-2 px-2 text-center">Portion / Serving</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {(() => {
                      const activeRecipes = recipes.filter(
                        (r) =>
                          r.productId === bomProduct.id &&
                          (!r.variantName || r.variantName === bomVariantName || bomVariantName === 'Standard')
                      );

                      if (activeRecipes.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-zinc-500 font-sans italic">
                              No ingredients mapped yet. Select from the dropdown above to add!
                            </td>
                          </tr>
                        );
                      }

                      return activeRecipes.map((rec) => {
                        const ing = ingredients.find((i) => i.id === rec.ingredientId);
                        const cost = ing ? rec.quantity * ing.unitCost : 0;

                        return (
                          <tr key={rec.id} className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-sans text-white font-semibold">
                              {ing?.name || 'Item'}
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-800 w-fit mx-auto">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBomQty(rec.id, ing?.unit === 'pcs' ? -1 : -0.01)}
                                  className="w-4 h-4 rounded bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="w-12 text-center font-bold text-white">
                                  {rec.quantity} {ing?.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBomQty(rec.id, ing?.unit === 'pcs' ? 1 : 0.01)}
                                  className="w-4 h-4 rounded bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                              {settings.currency} {Math.round(cost)}
                            </td>

                            <td className="py-2.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveBomIngredient(rec.id)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-[11px] text-zinc-500 font-sans">
                Changes apply instantly across POS and live sales profitability
              </span>
              <button
                type="button"
                onClick={() => setBomProduct(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
