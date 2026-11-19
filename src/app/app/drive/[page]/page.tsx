import { shellPageMetadata, shellParams, shellSection } from "@/features/shell/routes";

export const generateStaticParams = shellParams("driver");
export const generateMetadata = shellPageMetadata("driver");

export default shellSection("driver");
