import { shellPageMetadata, shellParams, shellSection } from "@/features/shell/routes";

export const generateStaticParams = shellParams("shipper");
export const generateMetadata = shellPageMetadata("shipper");

export default shellSection("shipper");
