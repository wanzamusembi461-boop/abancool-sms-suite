import { Sparkles } from "lucide-react";

export function PageStub({ title, description, comingIn }: { title: string; description: string; comingIn: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="glass-card-lg p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-primary">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">Coming next</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{comingIn}</p>
      </div>
    </div>
  );
}
