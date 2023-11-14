"use client";

import { ChevronDown, ChevronUp, Loader2, RotateCw, ZoomInIcon } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useResizeDetector } from "react-resize-detector";
import SimpleBar from "simplebar-react";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";
import PdfFullScreen from "./PdfFullScreen";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();

type PdfRendererProps = {
    url: string;
};

const PdfRenderer = ({ url }: PdfRendererProps) => {
    const { toast } = useToast();
    const [numPages, setNumPages] = useState<number>();
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);
    const [renderedScale, setRenderedScale] = useState<number | null>(null);

    const isLoading = renderedScale != scale;

    const customPageValidator = z.object({
        page: z.string().refine((num) => Number(num) > 0 && Number(num) <= numPages!),
    });

    type TCustomPageValidator = z.infer<typeof customPageValidator>;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<TCustomPageValidator>({
        defaultValues: {
            page: "1",
        },
        resolver: zodResolver(customPageValidator),
    });

    const { width, ref } = useResizeDetector();

    const handlePageSubmit = ({ page }: TCustomPageValidator) => {
        setCurrentPage(Number(page));
        setValue("page", String(page));
    };

    return (
        <div className="w-full bg-white rounded-md shadow flex flex-col items-center">
            <div className="h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2">
                <div className="flex items-center gap-1.5">
                    <Button
                        aria-label="previous page"
                        variant={"ghost"}
                        disabled={currentPage <= 1}
                        onClick={() => {
                            setCurrentPage((prev) => (prev - 1 > 1 ? prev - 1 : 1));
                            setValue("page", String(currentPage - 1));
                        }}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1.5">
                        <Input
                            className={cn("w-12 h-8", errors.page && "focus-visible:ring-red-500")}
                            {...register("page")}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSubmit(handlePageSubmit)();
                                }
                            }}
                        />
                        <p className="text-zinc-700 space-x-1 text-sm">
                            <span>/</span>
                            <span>{numPages ?? "x"}</span>
                        </p>
                    </div>
                    <Button
                        aria-label="next page"
                        variant={"ghost"}
                        disabled={numPages === undefined || numPages === currentPage}
                        onClick={() => {
                            setCurrentPage((prev) => (prev + 1 > numPages! ? numPages! : prev + 1));
                            setValue("page", String(currentPage + 1));
                        }}
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="gap-1.5" aria-label="zoom" variant="ghost">
                                <ZoomInIcon className="h-4 w-4" />
                                {scale * 100}%
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="z-20">
                            <DropdownMenuItem onSelect={() => setScale(1)}>100%</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(1.5)}>150%</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(2)}>200%</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(2.5)}>250%</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        aria-label="rotate 90 degrees"
                        variant={"ghost"}
                        onClick={() => setRotation((prev) => prev + 90)}
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>

                    <PdfFullScreen fileUrl={url} />
                </div>
            </div>
            <div className="flex-1 w-full max-h-screen">
                <SimpleBar autoHide={false} className="max-h-[calc(100vh-10rem)]">
                    <div ref={ref}>
                        <Document
                            loading={
                                <div className="flex justify-center">
                                    <Loader2 className="my-24 h-6 w-6 animate-spin" />
                                </div>
                            }
                            onLoad={() => {
                                toast({
                                    title: "Error Loading PDF",
                                    description: "Please try again later",
                                    variant: "destructive",
                                });
                            }}
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages);
                            }}
                            className="max-h-full"
                            file={url}
                        >
                            {isLoading && renderedScale ? (
                                <Page
                                    width={width ? width : 1}
                                    pageNumber={currentPage}
                                    scale={scale}
                                    rotate={rotation}
                                    key={"@" + renderedScale}
                                />
                            ) : null}
                            <Page
                                width={width ? width : 1}
                                pageNumber={currentPage}
                                scale={scale}
                                rotate={rotation}
                                className={cn(isLoading ? "hidden" : "")}
                                key={"@" + scale}
                                loading={
                                    <div className="flex justify-center">
                                        <Loader2 className="my-24 h-6 w-6 animate-spin" />
                                    </div>
                                }
                                onRenderSuccess={() => setRenderedScale(scale)}
                            />
                        </Document>
                    </div>
                </SimpleBar>
            </div>
        </div>
    );
};

export default PdfRenderer;
