import { shellPageMetadata, shellParams, shellSection } from "@/features/shell/routes";

export const generateStaticParams = shellParams("agent");
export const generateMetadata = shellPageMetadata("agent");

export default shellSection("agent");
