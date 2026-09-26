import { SubmissionForm } from "./SubmissionForm";

export function CreateTask({ data, onCreated, setToast, setRoute }) {
  return <SubmissionForm mode="task" data={data} onCreated={onCreated} setToast={setToast} setRoute={setRoute} />;
}
