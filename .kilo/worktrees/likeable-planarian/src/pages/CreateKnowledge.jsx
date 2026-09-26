import { SubmissionForm } from "./SubmissionForm";

export function CreateKnowledge({ data, onCreated, setToast, setRoute }) {
  return <SubmissionForm mode="knowledge" data={data} onCreated={onCreated} setToast={setToast} setRoute={setRoute} />;
}
