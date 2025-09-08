import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'
import { notFound } from 'next/navigation'
 
export const generateStaticParams = generateStaticParamsFor('mdxPath')
 
export async function generateMetadata(props) {
  const params = await props.params
  
  try {
    const { metadata } = await importPage(params.mdxPath)
    return metadata
  } catch (error) {
    // Return empty metadata for non-existent pages
    return {}
  }
}
 
const Wrapper = getMDXComponents().wrapper
 
export default async function Page(props) {
  const params = await props.params
  
  try {
    const {
      default: MDXContent,
      toc,
      metadata,
      sourceCode
    } = await importPage(params.mdxPath)
    
    return (
      <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
        <MDXContent {...props} params={params} />
      </Wrapper>
    )
  } catch (error) {
    // If the page doesn't exist, return 404
    notFound()
  }
}