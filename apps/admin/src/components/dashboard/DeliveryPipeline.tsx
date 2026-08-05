import type { DashboardDeliveryPipeline } from '@doublea/shared';
import { PIPELINE_STEPS } from '@/utils/dashboard';
import ChartCard from './ChartCard';

type DeliveryPipelineProps = {
  pipeline: DashboardDeliveryPipeline;
};

export default function DeliveryPipelinePanel({ pipeline }: DeliveryPipelineProps) {
  const max = Math.max(...PIPELINE_STEPS.map((s) => pipeline[s.key]), 1);

  return (
    <ChartCard title="Delivery pipeline" subtitle="From prep to delivered today">
      <div className="dash-pipeline">
        {PIPELINE_STEPS.map((step, index) => {
          const count = pipeline[step.key];
          const width = max > 0 ? Math.max((count / max) * 100, count > 0 ? 8 : 0) : 0;
          return (
            <div key={step.key} className="dash-pipeline__row">
              <div className="dash-pipeline__label">
                <span className="dash-pipeline__step">{index + 1}</span>
                {step.label}
              </div>
              <div className="dash-pipeline__bar-wrap">
                <div className="dash-pipeline__bar" style={{ width: `${width}%` }} />
              </div>
              <span className="dash-pipeline__count">{count}</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
