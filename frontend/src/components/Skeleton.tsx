import './Skeleton.css';

interface SkeletonProps {
  className?: string;
  count?: number;
  type?: 'text' | 'card' | 'avatar' | 'title';
  width?: string;
  height?: string;
}

const Skeleton = ({ className = '', count = 1, type = 'text', width, height }: SkeletonProps) => {
  const elements = [];
  for (let i = 0; i < count; i++) {
    elements.push(
      <div
        key={i}
        className={`skeleton skeleton-${type} ${className}`}
        style={{ width, height }}
      />
    );
  }
  return <>{elements}</>;
};

export default Skeleton;
