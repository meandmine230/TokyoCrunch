import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Ingredient, RecipeItem, Category } from '../../types';
import {
  getAllFromStore,
  saveToStore,
  deleteFromStore,
  addAuditLog,
} from '../../db/indexedDB';
import {
  Scroll,
  Plus,
  Trash2,
  Calculator,
  Percent,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  Copy,
  PlusCircle,
  Check,
  X,
  Minus,
  Edit2,
  FolderOpen,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export const RecipesModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);

  // Selection
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantName, setSelectedVariantName] = useState<string>('');
  const [ownerActualCostInput, setOwnerActualCostInput] = useState<string>('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Form to add ingredient to active product recipe
  const [addIngredientId, setAddIngredientId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);

  // Clone BOM Modal
  const [showCloneModal, setShowCloneModal] = useState<boolean>(false);
  const [cloneSourceProductId, setCloneSourceProductId] = useState<string>('');
  const [cloneSourceVariant, setCloneSourceVariant] = useState<string>('');

  // Quick Create Raw Material Modal
  const [showNewIngredientModal, setShowNewIngredientModal] = useState<boolean>(false);
  const [newIngName, setNewIngName] = useState<string>('');
  const [newIngUnit, setNewIngUnit] = useState<Ingredient['unit']>('kg');
  const [newIngCost, setNewIngCost] = useState<number>(100);
  const [newIngStock, setNewIngStock] = useState<number>(20);

  useEffect(() => {
    const loadRecipeData = async () => {
      try {
        const [cats, prods, ings, recs] = await Promise.all([
          getAllFromStore<Category>('categories'),
          getAllFromStore<Product>('products'),
          getAllFromStore<Ingredient>('ingredients'),
          getAllFromStore<RecipeItem>('recipes'),
        ]);
        setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
        setProducts(prods);
        setIngredients(ings);
        setRecipes(recs);

        if (prods.length > 0 && !selectedProductId) {
          setSelectedProductId(prods[0].id);
          setSelectedVariantName(prods[0].variants[0]?.name || 'Standard');
        }
        if (ings.length > 0 && !addIngredientId) {
          setAddIngredientId(ings[0].id);
        }
      } catch (err) {
        console.error('Failed to load recipes data', err);
      }
    };
    loadRecipeData();
  }, [dataVersion]);

  // Selected product
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // When active product or variant changes, sync owner actual cost input
  useEffect(() => {
    if (activeProduct) {
      if (activeProduct.variants.length > 0 && !activeProduct.variants.some((v) => v.name === selectedVariantName)) {
        setSelectedVariantName(activeProduct.variants[0].name);
      }
      const v = activeProduct.variants.find((x) => x.name === selectedVariantName);
      const customCost = v?.actualCost ?? activeProduct.actualCost;
      setOwnerActualCostInput(customCost !== undefined && customCost > 0 ? String(customCost) : '');
    }
  }, [activeProduct, selectedVariantName]);

  // Active recipes for selected product + variant
  const activeRecipeItems = useMemo(() => {
    if (!activeProduct) return [];
    return recipes.filter(
      (r) =>
        r.productId === activeProduct.id &&
        (!r.variantName || r.variantName === selectedVariantName || selectedVariantName === 'Standard')
    );
  }, [recipes, activeProduct, selectedVariantName]);

  // Selected variant price
  const activeVariantPrice = useMemo(() => {
    if (!activeProduct) return 0;
    const v = activeProduct.variants.find((x) => x.name === selectedVariantName);
    return v?.price || activeProduct.basePrice;
  }, [activeProduct, selectedVariantName]);

  // Active owner actual cost if set
  const currentOwnerActualCost = useMemo(() => {
    if (!activeProduct) return undefined;
    const v = activeProduct.variants.find((x) => x.name === selectedVariantName);
    return v?.actualCost ?? activeProduct.actualCost;
  }, [activeProduct, selectedVariantName]);

  // Calculate Total Food Cost & Margin
  const { ingredientCost, effectiveCost, grossProfit, marginPercent, isCustomCostActive } = useMemo(() => {
    let ingCost = 0;
    for (const item of activeRecipeItems) {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (ing) {
        ingCost += item.quantity * ing.unitCost;
      }
    }
    const roundedIngCost = Number(ingCost.toFixed(2));
    const isCustom = currentOwnerActualCost !== undefined && currentOwnerActualCost > 0;
    const effective = isCustom ? currentOwnerActualCost : roundedIngCost;
    const profit = Math.max(0, activeVariantPrice - effective);
    const margin = activeVariantPrice > 0 ? Number(((profit / activeVariantPrice) * 100).toFixed(1)) : 0;

    return {
      ingredientCost: roundedIngCost,
      effectiveCost: effective,
      grossProfit: profit,
      marginPercent: margin,
      isCustomCostActive: isCustom,
    };
  }, [activeRecipeItems, ingredients, activeVariantPrice, currentOwnerActualCost]);

  // Save Owner Independent Actual Cost
  const handleSaveOwnerCost = async () => {
    if (!activeProduct) return;
    const costVal = Number(ownerActualCostInput);
    if (isNaN(costVal) || costVal < 0) {
      showToast('Please enter a valid actual cost', 'warning');
      return;
    }

    const updatedProduct = { ...activeProduct };
    if (updatedProduct.variants && updatedProduct.variants.length > 0) {
      updatedProduct.variants = updatedProduct.variants.map((v) =>
        v.name === selectedVariantName ? { ...v, actualCost: costVal > 0 ? costVal : undefined } : v
      );
    }
    if (
      !updatedProduct.variants ||
      updatedProduct.variants.length <= 1 ||
      selectedVariantName === 'Standard' ||
      selectedVariantName === updatedProduct.variants[0]?.name
    ) {
      updatedProduct.actualCost = costVal > 0 ? costVal : undefined;
    }

    await saveToStore('products', updatedProduct);
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'RECIPE_ACTUAL_COST_UPDATED',
      module: 'Recipes',
      details: `Saved owner actual cost for ${activeProduct.name} (${selectedVariantName}): PKR ${costVal}`,
    });
    showToast(`Actual cost saved: ${settings.currency} ${costVal}`, 'success');
    triggerDataRefresh();
  };

  // Save specific variant actual cost
  const handleSaveVariantCost = async (variantName: string, costVal: number | undefined) => {
    if (!activeProduct) return;
    const updatedProduct = { ...activeProduct };
    if (updatedProduct.variants && updatedProduct.variants.length > 0) {
      updatedProduct.variants = updatedProduct.variants.map((v) =>
        v.name === variantName ? { ...v, actualCost: costVal && costVal > 0 ? costVal : undefined } : v
      );
      if (variantName === selectedVariantName || variantName === updatedProduct.variants[0]?.name) {
        updatedProduct.actualCost = costVal && costVal > 0 ? costVal : undefined;
        if (variantName === selectedVariantName) {
          setOwnerActualCostInput(costVal && costVal > 0 ? String(costVal) : '');
        }
      }
    } else {
      updatedProduct.actualCost = costVal && costVal > 0 ? costVal : undefined;
    }

    await saveToStore('products', updatedProduct);
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'RECIPE_ACTUAL_COST_UPDATED',
      module: 'Recipes',
      details: `Saved variant actual cost for ${activeProduct.name} (${variantName}): PKR ${costVal || 'BOM Sum'}`,
    });
    showToast(`Actual cost for ${variantName} updated`, 'success');
    triggerDataRefresh();
  };

  // Reset to Dynamic Ingredient Sum Cost
  const handleResetToIngredientCost = async () => {
    if (!activeProduct) return;
    const updatedProduct = { ...activeProduct };
    if (updatedProduct.variants && updatedProduct.variants.length > 0) {
      updatedProduct.variants = updatedProduct.variants.map((v) =>
        v.name === selectedVariantName ? { ...v, actualCost: undefined } : v
      );
    } else {
      updatedProduct.actualCost = undefined;
    }

    await saveToStore('products', updatedProduct);
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    setOwnerActualCostInput('');
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'RECIPE_ACTUAL_COST_RESET',
      module: 'Recipes',
      details: `Reset actual cost for ${activeProduct.name} (${selectedVariantName}) to ingredient BOM sum`,
    });
    showToast(`Reset to calculated ingredient BOM cost`, 'info');
    triggerDataRefresh();
  };

  // Filtered products list for left panel
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategoryFilter === 'all' || p.categoryId === selectedCategoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryFilter, searchQuery]);

  // Add Ingredient to Recipe
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !addIngredientId || addQty <= 0) {
      showToast('Select an ingredient and enter a positive quantity', 'warning');
      return;
    }

    // Check if ingredient already exists in this recipe
    const existing = activeRecipeItems.find((r) => r.ingredientId === addIngredientId);
    if (existing) {
      const updatedQty = Number((existing.quantity + addQty).toFixed(3));
      const updatedItem: RecipeItem = { ...existing, quantity: updatedQty };
      await saveToStore('recipes', updatedItem);
      setRecipes((prev) => prev.map((r) => (r.id === existing.id ? updatedItem : r)));
      showToast(`Updated ${ingredients.find((i) => i.id === addIngredientId)?.name} quantity to ${updatedQty}`, 'success');
      triggerDataRefresh();
      return;
    }

    const newRecipeItem: RecipeItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: activeProduct.id,
      variantName: selectedVariantName,
      ingredientId: addIngredientId,
      quantity: addQty,
    };

    await saveToStore('recipes', newRecipeItem);
    setRecipes((prev) => [...prev, newRecipeItem]);

    const ingName = ingredients.find((i) => i.id === addIngredientId)?.name;
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'RECIPE_ITEM_ADDED',
      module: 'Recipes',
      details: `Added ${addQty} of ${ingName} to ${activeProduct.name} (${selectedVariantName})`,
    });

    showToast(`Added ${ingName} to recipe BOM`, 'success');
    triggerDataRefresh();
  };

  // Direct Inline Quantity Update
  const handleUpdateQuantity = async (recipeId: string, deltaOrValue: number, isAbsolute: boolean = false) => {
    const item = recipes.find((r) => r.id === recipeId);
    if (!item) return;

    let newQty = isAbsolute ? deltaOrValue : item.quantity + deltaOrValue;
    newQty = Number(Math.max(0.001, newQty).toFixed(3));

    const updatedItem: RecipeItem = { ...item, quantity: newQty };
    await saveToStore('recipes', updatedItem);
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? updatedItem : r)));
    triggerDataRefresh();
  };

  // Remove Ingredient from Recipe
  const handleRemoveRecipeItem = async (recipeId: string) => {
    await deleteFromStore('recipes', recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    showToast('Ingredient removed from recipe BOM', 'info');
    triggerDataRefresh();
  };

  // Clone BOM from another product/variant
  const handleCloneBom = async () => {
    if (!activeProduct || !cloneSourceProductId) return;

    const sourceProduct = products.find((p) => p.id === cloneSourceProductId);
    const sourceRecipes = recipes.filter(
      (r) =>
        r.productId === cloneSourceProductId &&
        (!r.variantName || r.variantName === cloneSourceVariant || cloneSourceVariant === 'Standard')
    );

    if (sourceRecipes.length === 0) {
      showToast('Source product has no recipe BOM defined', 'warning');
      return;
    }

    // Delete current items for this variant first
    for (const cur of activeRecipeItems) {
      await deleteFromStore('recipes', cur.id);
    }

    // Insert cloned items
    const newItems: RecipeItem[] = [];
    for (const src of sourceRecipes) {
      const newItem: RecipeItem = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: activeProduct.id,
        variantName: selectedVariantName,
        ingredientId: src.ingredientId,
        quantity: src.quantity,
      };
      await saveToStore('recipes', newItem);
      newItems.push(newItem);
    }

    setRecipes((prev) => [
      ...prev.filter(
        (r) =>
          !(
            r.productId === activeProduct.id &&
            (!r.variantName || r.variantName === selectedVariantName || selectedVariantName === 'Standard')
          )
      ),
      ...newItems,
    ]);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'RECIPE_CLONED',
      module: 'Recipes',
      details: `Cloned BOM from ${sourceProduct?.name || ''} (${cloneSourceVariant}) to ${activeProduct.name} (${selectedVariantName})`,
    });

    showToast(`Cloned ${newItems.length} recipe ingredients from ${sourceProduct?.name}`, 'success');
    setShowCloneModal(false);
    triggerDataRefresh();
  };

  // Quick Create New Raw Material Ingredient
  const handleCreateNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim() || newIngCost < 0) {
      showToast('Enter valid ingredient name and cost', 'warning');
      return;
    }

    const newId = `ing-${Date.now()}`;
    const newIng: Ingredient = {
      id: newId,
      name: newIngName.trim(),
      unit: newIngUnit,
      unitCost: newIngCost,
      currentStock: newIngStock,
      minStockAlert: 5,
      updatedAt: new Date().toISOString(),
    };

    await saveToStore('ingredients', newIng);
    setIngredients((prev) => [...prev, newIng]);
    setAddIngredientId(newId);

    showToast(`Created raw ingredient "${newIng.name}" (PKR ${newIng.unitCost}/${newIng.unit})`, 'success');
    setShowNewIngredientModal(false);
    setNewIngName('');
    triggerDataRefresh();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#121214]">
      {/* ---------------- LEFT PANEL: MENU ITEM SELECTOR ---------------- */}
      <div className="w-full lg:w-88 bg-[#161619] border-r border-zinc-800/80 flex flex-col h-72 lg:h-full shrink-0">
        {/* Left Header & Search */}
        <div className="p-3.5 bg-[#18181b] border-b border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll className="w-4 h-4 text-[#FF6B00]" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                Menu BOM Recipes
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
              {filteredProducts.length} of {products.length} Items
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search burger, wrap, shawarma, fries..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                selectedCategoryFilter === 'all'
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryFilter(c.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  selectedCategoryFilter === c.id
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Items List */}
        <div className="flex-1 p-2 overflow-y-auto space-y-1.5">
          {filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs">
              No menu items match your search.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = p.id === selectedProductId;
              const mappedRecipeCount = recipes.filter((r) => r.productId === p.id).length;

              // Calculate item food cost preview (prioritize owner's independent actual cost)
              const pRecipes = recipes.filter((r) => r.productId === p.id);
              let estCost = 0;
              for (const r of pRecipes) {
                const ing = ingredients.find((i) => i.id === r.ingredientId);
                if (ing) estCost += r.quantity * ing.unitCost;
              }
              const roundedEstCost = Math.round(estCost);
              const ownerCustomCost = p.variants?.[0]?.actualCost ?? p.actualCost;
              const hasCustomCost = ownerCustomCost !== undefined && ownerCustomCost > 0;
              const activeCost = hasCustomCost ? ownerCustomCost : roundedEstCost;
              const hasCost = hasCustomCost || mappedRecipeCount > 0;
              const margin = p.basePrice > 0 ? Math.round(((p.basePrice - activeCost) / p.basePrice) * 100) : 0;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setSelectedVariantName(p.variants[0]?.name || 'Standard');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-[#FF6B00] text-white font-semibold shadow-md shadow-[#FF6B00]/25'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate font-bold text-xs">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                      Price: {settings.currency} {p.basePrice} ·{' '}
                      {hasCost ? (
                        <span className={isSelected ? 'text-emerald-200' : 'text-emerald-400 font-semibold'}>
                          Cost: {settings.currency} {activeCost} {hasCustomCost ? '(Owner Actual)' : ''} ({margin}% margin)
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-medium">No Cost Set</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-bold ${
                      isSelected
                        ? 'bg-black/25 text-white'
                        : hasCustomCost
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                        : mappedRecipeCount > 0
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {hasCustomCost ? 'Custom Cost' : mappedRecipeCount > 0 ? `${mappedRecipeCount} ingr` : 'No BOM'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------- RIGHT PANEL: SIMPLE-SIDE BOM EDITOR ---------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
        {activeProduct ? (
          <>
            {/* Header with Title, Variants & Quick Actions */}
            <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base text-white">
                    {activeProduct.name}
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase">
                    BOM Specification
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Adjust raw ingredients and serving sizes deducted in real-time from inventory on every sale.
                </p>
              </div>

              {/* Variant Switcher & Clone Action */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Variant Switcher Pills */}
                {activeProduct.variants.length > 1 && (
                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    {activeProduct.variants.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => setSelectedVariantName(v.name)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          selectedVariantName === v.name
                            ? 'bg-[#FF6B00] text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {v.name} ({settings.currency} {v.price})
                      </button>
                    ))}
                  </div>
                )}

                {/* Clone Recipe Button */}
                <button
                  onClick={() => {
                    setCloneSourceProductId(products[0]?.id || '');
                    setCloneSourceVariant(products[0]?.variants[0]?.name || 'Standard');
                    setShowCloneModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
                  title="Copy BOM from another menu item"
                >
                  <Copy className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Copy BOM</span>
                </button>
              </div>
            </div>

            {/* Live Financial Metrics Bar (Selling Price, Food Cost, Profit, Margin) */}
            <div className="p-3.5 bg-[#141417] border-b border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                  Selling Price ({selectedVariantName})
                </span>
                <span className="font-mono text-lg font-black text-white mt-0.5 block">
                  {settings.currency} {activeVariantPrice.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                    Active Cost (COGS)
                  </span>
                  {isCustomCostActive ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                      Custom Cost
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-bold uppercase">
                      BOM Sum
                    </span>
                  )}
                </div>
                <span className="font-mono text-lg font-black text-amber-400 mt-0.5 block">
                  {settings.currency} {effectiveCost.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                  Net Profit per Unit
                </span>
                <span className="font-mono text-lg font-black text-emerald-400 mt-0.5 block">
                  +{settings.currency} {grossProfit.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                  Profit Margin %
                </span>
                <span
                  className={`font-mono text-lg font-black mt-0.5 block ${
                    marginPercent >= 55
                      ? 'text-emerald-400'
                      : marginPercent >= 40
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {marginPercent}%
                </span>
              </div>
            </div>

            {/* Independent Owner Costing Control Panel */}
            <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#FF6B00]" />
                    <span>Owner's Actual Cost for "{selectedVariantName}" (Independent Override):</span>
                  </span>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveOwnerCost();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-zinc-500 font-mono text-xs">{settings.currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder={`e.g. ${ingredientCost}`}
                      value={ownerActualCostInput}
                      onChange={(e) => setOwnerActualCostInput(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 font-mono font-extrabold text-white text-xs focus:outline-none focus:border-[#FF6B00]"
                      title="Enter independent actual cost and press Enter or Save"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Actual Cost</span>
                    </button>
                    {isCustomCostActive && (
                      <button
                        type="button"
                        onClick={handleResetToIngredientCost}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                        title="Reset to dynamic ingredient BOM sum"
                      >
                        Reset to BOM Sum
                      </button>
                    )}
                  </form>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {isCustomCostActive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Active Custom Cost: {settings.currency} {effectiveCost} (Raw BOM: {settings.currency} {ingredientCost})</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      Calculated BOM Sum: <strong className="text-white font-mono">{settings.currency} {ingredientCost}</strong> · Type your cost above to write independently
                    </span>
                  )}
                </div>
              </div>

              {/* Multi-Variant Costing Grid if product has multiple variants */}
              {activeProduct.variants.length > 1 && (
                <div className="pt-2 border-t border-zinc-900">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-[#FF6B00]" />
                      <span>All Variants Costing Grid for {activeProduct.name}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Write independent costing for each size/variant directly
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                    {activeProduct.variants.map((v) => {
                      const vRecipes = recipes.filter(
                        (r) =>
                          r.productId === activeProduct.id &&
                          (!r.variantName || r.variantName === v.name || v.name === 'Standard')
                      );
                      let vBomCost = 0;
                      for (const r of vRecipes) {
                        const ing = ingredients.find((i) => i.id === r.ingredientId);
                        if (ing) vBomCost += r.quantity * ing.unitCost;
                      }
                      const roundedVBom = Math.round(vBomCost);
                      const hasCustom = v.actualCost !== undefined && v.actualCost > 0;
                      const activeVCost = hasCustom ? v.actualCost! : roundedVBom;
                      const vProfit = Math.max(0, v.price - activeVCost);
                      const vMargin = v.price > 0 ? Math.round((vProfit / v.price) * 100) : 0;
                      const isCurVar = v.name === selectedVariantName;

                      return (
                        <div
                          key={v.name}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isCurVar
                              ? 'bg-zinc-900 border-[#FF6B00]/60 ring-1 ring-[#FF6B00]/40'
                              : 'bg-zinc-950/80 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{v.name}</span>
                            <span className="font-mono text-zinc-400 text-xs">
                              {settings.currency} {v.price}
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-mono">Cost:</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder={String(roundedVBom)}
                              defaultValue={v.actualCost || ''}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  handleSaveVariantCost(v.name, val > 0 ? val : undefined);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = Number((e.target as HTMLInputElement).value);
                                  if (!isNaN(val) && val >= 0) {
                                    handleSaveVariantCost(v.name, val > 0 ? val : undefined);
                                  }
                                }
                              }}
                              className="w-20 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 font-mono font-bold text-white text-[11px] text-center focus:outline-none focus:border-[#FF6B00]"
                              title="Type actual cost and press Enter or click outside to save"
                            />
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                vMargin >= 50
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-amber-950 text-amber-400'
                              }`}
                            >
                              {vMargin}%
                            </span>
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-500 flex justify-between">
                            <span>BOM: {settings.currency} {roundedVBom}</span>
                            {hasCustom && <span className="text-emerald-400 font-semibold">Custom Set</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recipe Content Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Simple Add Ingredient Bar */}
              <form
                onSubmit={handleAddIngredient}
                className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-wrap items-end gap-3 shadow-sm"
              >
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">
                      Add Raw Ingredient / Material
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewIngredientModal(true)}
                      className="text-[10px] text-[#FF6B00] hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Material</span>
                    </button>
                  </div>
                  <select
                    value={addIngredientId}
                    onChange={(e) => setAddIngredientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} — {settings.currency} {ing.unitCost} / {ing.unit} (Stock: {ing.currentStock} {ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-36">
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Portion Quantity
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={addQty || ''}
                      onChange={(e) => setAddQty(Number(e.target.value) || 0)}
                      placeholder="1"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                    />
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                      {ingredients.find((i) => i.id === addIngredientId)?.unit || ''}
                    </span>
                  </div>
                </div>

                {/* Quick preset buttons */}
                <div className="hidden sm:flex items-center gap-1 pb-1">
                  {[
                    { label: '1 pcs', qty: 1 },
                    { label: '0.15 kg', qty: 0.15 },
                    { label: '0.25 kg', qty: 0.25 },
                    { label: '0.03 kg', qty: 0.03 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAddQty(preset.qty)}
                      className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-400 hover:text-white transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25 flex items-center gap-1.5 h-9"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to BOM</span>
                </button>
              </form>

              {/* Table of BOM Components with In-place Editing */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3 bg-zinc-950/60 border-b border-zinc-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Bill of Materials Components</span>
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {activeRecipeItems.length} Ingredients Defined
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Use <strong className="text-white">+ / -</strong> or click numbers to edit quantities directly
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/40">
                        <th className="py-2.5 px-4 font-semibold">Ingredient Material</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-48">Serving Quantity</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 font-semibold text-right text-amber-400">Component Cost</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {activeRecipeItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-zinc-500 italic font-sans">
                            <div className="max-w-md mx-auto space-y-2">
                              <p className="font-semibold text-zinc-400 text-sm">
                                No recipe BOM defined for {activeProduct.name} ({selectedVariantName})
                              </p>
                              <p className="text-xs text-zinc-500">
                                Use the selector above to add buns, chicken fillet, wraps, pita, sauces, or packaging boxes, or copy from an existing recipe.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activeRecipeItems.map((rec) => {
                          const ing = ingredients.find((i) => i.id === rec.ingredientId);
                          const cost = ing ? rec.quantity * ing.unitCost : 0;

                          return (
                            <tr key={rec.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="py-3 px-4 font-sans">
                                <div className="font-bold text-white text-xs">
                                  {ing?.name || 'Raw Ingredient'}
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Stock: {ing?.currentStock || 0} {ing?.unit} on hand
                                </div>
                              </td>

                              {/* Interactive Inline Quantity Adjuster */}
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800 w-fit mx-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(rec.id, ing?.unit === 'pcs' ? -1 : -0.01)}
                                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>

                                  <input
                                    type="number"
                                    step={ing?.unit === 'pcs' ? '1' : '0.001'}
                                    min="0.001"
                                    value={rec.quantity}
                                    onChange={(e) =>
                                      handleUpdateQuantity(rec.id, Number(e.target.value) || 0.001, true)
                                    }
                                    className="w-16 text-center bg-transparent font-mono font-bold text-xs text-white focus:outline-none"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(rec.id, ing?.unit === 'pcs' ? 1 : 0.01)}
                                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                                    title="Increase quantity"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>

                                  <span className="text-[10px] text-zinc-500 font-sans pl-1">
                                    {ing?.unit}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right text-zinc-400 text-xs">
                                {settings.currency} {ing?.unitCost || 0} / {ing?.unit}
                              </td>

                              <td className="py-3 px-3 text-right font-bold text-amber-400 text-xs">
                                {settings.currency} {Number(cost.toFixed(2))}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecipeItem(rec.id)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors"
                                  title="Delete ingredient from recipe"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total BOM Footer Bar */}
                {activeRecipeItems.length > 0 && (
                  <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-300">
                      Total Raw Material BOM Cost ({selectedVariantName}):
                    </span>
                    <span className="font-mono font-black text-amber-400 text-sm">
                      {settings.currency} {ingredientCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
            Select a product from the list to view and edit its BOM
          </div>
        )}
      </div>

      {/* ---------------- MODAL 1: CLONE BOM RECIPE ---------------- */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#FF6B00]" />
                <span>Copy BOM Recipe</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Copy all raw materials and quantities from another item into{' '}
                <strong className="text-white">{activeProduct?.name} ({selectedVariantName})</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Source Product to Copy From
                </label>
                <select
                  value={cloneSourceProductId}
                  onChange={(e) => {
                    setCloneSourceProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    setCloneSourceVariant(prod?.variants[0]?.name || 'Standard');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {products
                    .filter((p) => p.id !== activeProduct?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Source Variant if multi-variant */}
              {(() => {
                const src = products.find((p) => p.id === cloneSourceProductId);
                if (src && src.variants.length > 1) {
                  return (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        Source Variant
                      </label>
                      <select
                        value={cloneSourceVariant}
                        onChange={(e) => setCloneSourceVariant(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                      >
                        {src.variants.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({settings.currency} {v.price})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloneBom}
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs transition-colors shadow-md shadow-[#FF6B00]/25"
              >
                Copy Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: QUICK CREATE RAW INGREDIENT ---------------- */}
      {showNewIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateNewIngredient}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#FF6B00]" />
                <span>Create New Raw Material Ingredient</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Add an ingredient to your inventory to use in recipes.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  placeholder="e.g. Brioche Sesame Bun, Garlic Mayo, Peri Peri Powder"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value as Ingredient['unit'])}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  >
                    <option value="pcs">pcs (pieces)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="g">g (grams)</option>
                    <option value="litres">litres</option>
                    <option value="ml">ml (millilitres)</option>
                    <option value="pack">pack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Unit Cost ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newIngCost || ''}
                    onChange={(e) => setNewIngCost(Number(e.target.value) || 0)}
                    placeholder="e.g. 35"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Initial On-Hand Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={newIngStock || ''}
                  onChange={(e) => setNewIngStock(Number(e.target.value) || 0)}
                  placeholder="20"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewIngredientModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs transition-colors shadow-md shadow-[#FF6B00]/25"
              >
                Save Ingredient
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
