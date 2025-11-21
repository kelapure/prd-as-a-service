// Simple image-only cards for Hero section
import binaryScoreImg from "../assets/binary-score.png";
import fixPlanImg from "../assets/fix-plan.png";
import taskGraphImg from "../assets/task-graph.png";

export function HeroBinaryImage() {
  return (
    <img 
      src={binaryScoreImg} 
      alt="Binary Score Example" 
      className="w-full h-auto block"
    />
  );
}

export function HeroFixPlanImage() {
  return (
    <img 
      src={fixPlanImg} 
      alt="Fix Plan Example" 
      className="w-full h-full object-cover object-top block"
    />
  );
}

export function HeroAgentTasksImage() {
  return (
    <img 
      src={taskGraphImg} 
      alt="Agent Tasks Example" 
      className="w-full h-full object-cover object-top block"
    />
  );
}

