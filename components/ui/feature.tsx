import { cn } from "@/lib/utils";

export const FeatureCard = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    return (
      <div className={cn(`p-4 sm:p-8 relative overflow-hidden`, className)}>
        {children}
      </div>
    );
  };

  export const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
    return (
      <p className=" max-w-5xl mx-auto text-left tracking-tight font-semibold text-black dark:text-white text-xl md:text-2xl md:leading-snug">
        {children}
      </p>
    );
  };

  export const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
    return (
      <p
        className={cn(
          "text-sm md:text-base  max-w-4xl text-left mx-auto",
          "text-neutral-500 text-center font-normal dark:text-neutral-300",
          "text-left max-w-sm mx-0 md:text-sm my-2"
        )}
      >
        {children}
      </p>
    );
  };