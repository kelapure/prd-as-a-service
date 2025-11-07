import { Target, ListOrdered, Workflow } from "lucide-react";

const features = [
  {
    title: "Binary Scoring",
    description: "No fuzzy 1-10 scales. Each criterion is PASS or FAIL with quoted evidence from the document.",
    icon: Target
  },
  {
    title: "Prioritized Fix Plan",
    description: "Automatically identify highest-leverage improvements. Know exactly what to fix first.",
    icon: ListOrdered
  },
  {
    title: "Agent-Ready Tasks",
    description: "Get executable task units with dependencies mapped—ready to feed directly to AI agents or sprint planning.",
    icon: Workflow
  }
];

export function Features() {
  return (
    <section className="px-6 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-card rounded-[var(--radius-card)] p-8 space-y-4 border border-border shadow-[var(--elevation-sm)]"
            >
              <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-card-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}