"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { drops, formatInr, type Drop, type Product } from "@/content/merch";
import { cn } from "@/lib/utils";

/**
 * DROPS — the merch surface. Identical in both personas by design, so it
 * keeps its own black-and-bone identity rather than reskinning per face;
 * only the window chrome around it differs.
 *
 * Structure follows the release, not the catalogue: drop → story → visual →
 * availability → buy. Checkout is deliberately stubbed.
 */

const CART_KEY = "cluster-cart";

interface CartLine {
  productId: string;
  size: string;
  qty: number;
}

export function MerchDrops() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Survive the window being closed and reopened.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw) as CartLine[]);
    } catch {
      /* a corrupt cart is not worth crashing the page over */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const allProducts = useMemo(
    () => new Map(drops.flatMap((d) => d.products.map((p) => [p.id, p] as const))),
    [],
  );

  const add = (product: Product, size: string) =>
    setCart((prev) => {
      const i = prev.findIndex((l) => l.productId === product.id && l.size === size);
      if (i === -1) return [...prev, { productId: product.id, size, qty: 1 }];
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + 1 };
      return next;
    });

  const setQty = (idx: number, qty: number) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((_, i) => i !== idx)
        : prev.map((l, i) => (i === idx ? { ...l, qty } : l)),
    );

  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce(
    (sum, l) => sum + (allProducts.get(l.productId)?.priceInr ?? 0) * l.qty,
    0,
  );

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#0a0a0a] text-[#F5F2E3]">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0a0a0a]/95 px-6 py-4 backdrop-blur">
        <div>
          <p className="font-chrome text-[10px] uppercase tracking-[0.4em] text-white/40">
            The Cluster
          </p>
          <h2 className="font-chrome text-2xl uppercase tracking-[0.24em]">Drops</h2>
        </div>
        <button
          type="button"
          onClick={() => setCartOpen((v) => !v)}
          aria-expanded={cartOpen}
          className="border border-white/25 px-4 py-2 font-chrome text-xs uppercase tracking-[0.2em] transition hover:border-white hover:bg-white hover:text-black"
        >
          Cart ({count})
        </button>
      </header>

      {cartOpen && (
        <Cart
          cart={cart}
          products={allProducts}
          total={total}
          onQty={setQty}
          onClose={() => setCartOpen(false)}
        />
      )}

      {drops.map((drop) => (
        <DropSection key={drop.id} drop={drop} onAdd={add} />
      ))}

      <footer className="border-t border-white/10 px-6 py-10 text-center">
        <p className="font-body text-xs text-white/35">
          Product photography and final pricing pending. Every figure on this page is a
          placeholder.
        </p>
      </footer>
    </div>
  );
}

function DropSection({ drop, onAdd }: { drop: Drop; onAdd: (p: Product, size: string) => void }) {
  const remaining = drop.totalPieces - drop.claimedPieces;
  const pct = Math.round((drop.claimedPieces / drop.totalPieces) * 100);
  const isLive = drop.status === "live";

  return (
    <section className="border-b border-white/10 px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <p className="font-chrome text-sm uppercase tracking-[0.4em] text-white/40">
            Drop {drop.number}
          </p>
          <StatusPill status={drop.status} />
        </div>

        <h3 className="mt-3 font-chrome text-5xl uppercase leading-none tracking-[0.06em] sm:text-7xl">
          {drop.name}
        </h3>
        <p className="mt-2 font-body text-sm text-white/50">{drop.subtitle}</p>

        <div className="mt-8 grid gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            {drop.story.map((p, i) => (
              <p key={i} className="mb-3 font-body text-sm leading-relaxed text-white/75">
                {p}
              </p>
            ))}

            <div className="mt-6">
              <div className="flex items-baseline justify-between font-chrome text-xs uppercase tracking-[0.18em]">
                <span>
                  {drop.claimedPieces} / {drop.totalPieces} claimed
                </span>
                <span className="text-white/45">
                  {isLive
                    ? `${remaining} left`
                    : drop.status === "sold_out"
                      ? "Closed"
                      : "Not yet open"}
                </span>
              </div>
              <div
                className="mt-2 h-1 w-full bg-white/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={drop.totalPieces}
                aria-valuenow={drop.claimedPieces}
                aria-label={`${drop.name} pieces claimed`}
              >
                <div className="h-full bg-[#ff0033]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {drop.products.map((p) => (
              <ProductCard key={p.id} product={p} disabled={!isLive} onAdd={onAdd} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  disabled,
  onAdd,
}: {
  product: Product;
  disabled: boolean;
  onAdd: (p: Product, size: string) => void;
}) {
  const [size, setSize] = useState(product.sizes[0] ?? "");

  return (
    <article className="border border-white/15">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141414]">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="480px" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="font-chrome text-[10px] uppercase tracking-[0.3em] text-white/25">
              Photography pending
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h4 className="font-chrome text-base uppercase tracking-[0.12em]">{product.name}</h4>
          <p className="font-chrome text-base tabular-nums">{formatInr(product.priceInr)}</p>
        </div>
        <p className="mt-1 font-body text-xs text-white/50">{product.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              aria-pressed={size === s}
              className={cn(
                "min-w-11 border px-3 py-2 font-chrome text-xs transition",
                size === s
                  ? "border-white bg-white text-black"
                  : "border-white/25 text-white/70 hover:border-white/60",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onAdd(product, size)}
          className="mt-4 w-full bg-[#ff0033] py-3 font-chrome text-xs uppercase tracking-[0.24em] text-white transition hover:bg-[#d4002b] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
        >
          {disabled ? "Not open yet" : "Claim"}
        </button>
      </div>
    </article>
  );
}

function Cart({
  cart,
  products,
  total,
  onQty,
  onClose,
}: {
  cart: CartLine[];
  products: Map<string, Product>;
  total: number;
  onQty: (idx: number, qty: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-[73px] z-10 border-b border-white/15 bg-[#111] px-6 py-5">
      <div className="mx-auto max-w-5xl">
        {cart.length === 0 ? (
          <p className="font-body text-sm text-white/45">Nothing claimed yet.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {cart.map((line, i) => {
                const p = products.get(line.productId);
                if (!p) return null;
                return (
                  <li key={`${line.productId}-${line.size}`} className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-chrome text-sm uppercase tracking-[0.1em]">{p.name}</p>
                      <p className="font-body text-xs text-white/45">Size {line.size}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onQty(i, line.qty - 1)}
                        aria-label={`Remove one ${p.name}`}
                        className="h-9 w-9 border border-white/25 font-chrome hover:border-white"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-chrome tabular-nums">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => onQty(i, line.qty + 1)}
                        aria-label={`Add one ${p.name}`}
                        className="h-9 w-9 border border-white/25 font-chrome hover:border-white"
                      >
                        +
                      </button>
                    </div>
                    <p className="w-24 text-right font-chrome tabular-nums">
                      {formatInr(p.priceInr * line.qty)}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4">
              <p className="font-chrome text-sm uppercase tracking-[0.16em]">
                Total <span className="ml-3 tabular-nums">{formatInr(total)}</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-body text-xs text-white/60 underline hover:text-white"
                >
                  Keep looking
                </button>
                <button
                  type="button"
                  disabled
                  title="Payment is not connected yet"
                  className="cursor-not-allowed bg-white/10 px-6 py-3 font-chrome text-xs uppercase tracking-[0.24em] text-white/40"
                >
                  Checkout — not connected
                </button>
              </div>
            </div>
            <p className="mt-3 font-body text-[11px] text-white/35">
              Cart and sizing are live; payment is intentionally stubbed until a provider is
              chosen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Drop["status"] }) {
  const copy = status === "live" ? "Open now" : status === "sold_out" ? "Sold out" : "Coming";
  return (
    <span
      className={cn(
        "border px-3 py-1 font-chrome text-[10px] uppercase tracking-[0.2em]",
        status === "live"
          ? "border-[#ff0033] text-[#ff0033]"
          : status === "sold_out"
            ? "border-white/25 text-white/40"
            : "border-white/40 text-white/70",
      )}
    >
      {copy}
    </span>
  );
}

export default MerchDrops;
