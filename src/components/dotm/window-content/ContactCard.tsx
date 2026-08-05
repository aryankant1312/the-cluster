const BIO =
  "devilonthemic (also known as DOTM or Devil on the Mic) is a rising Delhi-based hip-hop artist, rapper, and songwriter who gained wider recognition after appearing on MTV Hustle Season 4 in 2024. His notable projects include the debut EP 666 - The Beginning featuring tracks like \"D.O.T.M\" and \"Thak Thak\", as well as popular independent singles like \"Bhala Kyun\" and \"Paranoid\".";

export function ContactCard() {
  return (
    <div className="flex gap-4">
      <div className="w-20 h-20 shrink-0 rounded-full bg-persona-surface-alt border border-white/10 flex items-center justify-center font-headline text-xl">
        D
      </div>
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-fg-muted text-xs">NAME</p>
          <p>DOTM</p>
        </div>
        <div>
          <p className="text-fg-muted text-xs">POSITION</p>
          <p>Rapper, Producer, Composer</p>
        </div>
        <div>
          <p className="text-fg-muted text-xs">MAIL</p>
          <p>dotmoriginal@gmail.com</p>
        </div>
        <div>
          <p className="text-fg-muted text-xs">PHONE</p>
          <p>+91 9667374331</p>
        </div>
        <p className="text-xs text-fg-muted leading-relaxed pt-2">{BIO}</p>
      </div>
    </div>
  );
}
